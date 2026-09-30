"""Create corrected FBX copies; verify against the intact reference assembly. Sources are read-only. Requires numpy."""
from pathlib import Path
import re,json,numpy as np

def parse(p):
 s=p.read_text();models=dict(re.findall(r'(?m)^\tModel: (\d+), "Model::([^"]*)"',s));parents=dict(re.findall(r'(?m)^\s*C: "OO",(\d+),(\d+)',s))
 def chain(i):
  out=[]
  while i in parents:
   i=parents[i];out.append(models.get(i,i))
  return '/'.join(out)
 geos=[]
 for m in re.finditer(r'(?ms)^\tGeometry: (\d+),[^\n]*\{(.*?)^\t}',s):
  v=re.search(r'Vertices: \*(\d+)\s*\{\s*a: ([^}]+)',m[2]);a=np.fromstring(v[2].replace('\n',''),sep=',').reshape(-1,3)
  geos.append({'id':m[1],'path':chain(m[1]),'v':a})
 return s,geos

def distance(a,b):
 mx=0.; total=0.
 for i in range(0,len(a),128):
  d=((a[i:i+128,None,:]-b[None,:,:])**2).sum(axis=2).min(axis=1)
  mx=max(mx,float(np.sqrt(d.max())));total+=float(d.sum())
 return mx,(total/len(a))**.5

import hashlib,shutil,csv

def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def arrs(s,key):
 return [np.fromstring(m[1].replace('\n',''),sep=',') for m in re.finditer(key+r': \*\d+\s*\{\s*a: ([^}]+)',s)]
def transform_array(s,key,fn):
 pattern=r'('+key+r': \*(\d+)\s*\{\s*a: )([^}]+)(\})'
 def sub(m):
  a=np.fromstring(m[3].replace('\n',''),sep=',')
  assert a.size==int(m[2]) and a.size%3==0
  b=fn(a.reshape(-1,3))
  return m[1]+','.join(format(x,'.15g') for x in b.ravel())+'\n\t\t'+m[4]
 return re.sub(pattern,sub,s)

def main():
 full=next(Path('Models').rglob('Premium500x300.fbx'));sources=[full]+[next(Path('Models').rglob('RegenrinneDeckel'+side+'.fbx')) for side in ['Links','Rechts']]
 hashes={str(p):digest(p) for p in sources};_,refs=parse(full)
 refcaps=[g for g in refs if 'Regenrinne_Deckel' in g['path']]
 out=Path('PreparedModels/Premium/Regenrinne');out.mkdir(parents=True,exist_ok=True)
 report={'reference':str(full),'source_sha256':hashes,'unit':'cm','reference_width_cm':500,'up_axis':'Y','inside_view_convention':'Looking from wall toward garden (+Z): left is +X; right is -X.','tolerance_cm':1e-7,'parts':[]}
 for side,p in zip(['Links','Rechts'],sources[1:]):
  s,parts=parse(p)
  # These files bake all geometry into vertices. Reject unexpected node transforms.
  for prop,expected in [('Lcl Translation',[0,0,0]),('Lcl Rotation',[0,0,0]),('Lcl Scaling',[1,1,1]),('GeometricTranslation',[0,0,0]),('GeometricRotation',[0,0,0]),('GeometricScaling',[1,1,1]),('PreRotation',[0,0,0]),('PostRotation',[0,0,0]),('RotationPivot',[0,0,0]),('ScalingPivot',[0,0,0]),('RotationOffset',[0,0,0]),('ScalingOffset',[0,0,0])]:
   lines=re.findall(r'^\s*P: ("'+prop+r'",[^\n]+)',s,re.M)
   assert lines,prop
   for line in lines:
    vals=next(csv.reader([line],skipinitialspace=True))[-3:]
    assert np.allclose(np.array(vals,dtype=float),expected),prop
  cap=next(g for g in parts if 'Regenrinne_Deckel' in g['path'])
  ref=(max if side=='Links' else min)(refcaps,key=lambda g:g['v'][:,0].mean())
  rotation=np.array([[0,0,-1],[0,1,0],[1,0,0]],dtype=float)
  assert np.linalg.det(rotation)==1
  a=cap['v']@rotation.T*.1;t=ref['v'].min(axis=0)-a.min(axis=0)
  corrected=transform_array(s,'Vertices',lambda a:a@rotation.T*.1+t)
  for key in ['Normals','Tangents','Binormals']:
   corrected=transform_array(corrected,key,lambda a:a@rotation.T)
   for before,after in zip(arrs(s,key),arrs(corrected,key)):
    assert before.size==after.size
    assert np.allclose(np.linalg.norm(before.reshape(-1,3),axis=1),np.linalg.norm(after.reshape(-1,3),axis=1),atol=1e-10)
  # Keep texture references portable in the corrected artifact tree.
  texrel=p.stem+'/Metal_06_1K.png';texsource=p.parent/texrel
  assert texsource.is_file(),texsource
  corrected=re.sub(r'((?:RelativeFilename|FileName|Filename): ")[^"]+(\")',lambda m:m[1]+texrel+m[2],corrected)
  texout=out/texrel;texout.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(texsource,texout)
  assert digest(texsource)==digest(texout)
  target=out/p.name;target.write_text(corrected)
  saved,got=parse(target);assert len(got)==len(parts)==5
  assert [x.tolist() for x in arrs(s,'PolygonVertexIndex')]==[x.tolist() for x in arrs(saved,'PolygonVertexIndex')]
  for g,idx in zip(got,arrs(saved,'PolygonVertexIndex')):
   assert np.equal(idx,np.floor(idx)).all()
   decoded=np.where(idx<0,-idx-1,idx)
   assert decoded.min()>=0 and decoded.max()<len(g['v'])
   assert np.array_equal(np.flatnonzero(idx<0),np.arange(2,len(idx),3))
  candidates=[g for g in refs if 'Deckel_Schrauben' in g['path'] and 'Regenrinne' in g['path'] and ((g['v'][:,0].mean()>250)==(side=='Links'))]+[ref]
  item={'side':side,'source':str(p),'output':str(target),'output_sha256':digest(target),'scale':.1,'rotation':rotation.tolist(),'translation_cm':t.tolist(),'reference_anchor_cm':ref['v'].min(axis=0).tolist(),'plate_size_xyz_cm':np.ptp(ref['v'],axis=0).tolist(),'meshes':[]}
  for g in got:
   a=g['v'];r=min(candidates,key=lambda r:np.linalg.norm((r['v'].min(axis=0)+r['v'].max(axis=0))-(a.min(axis=0)+a.max(axis=0))))
   d1,rms1=distance(a,r['v']);d2,rms2=distance(r['v'],a)
   bboxerr=float(np.abs(np.array([a.min(axis=0),a.max(axis=0)])-np.array([r['v'].min(axis=0),r['v'].max(axis=0)])).max())
   assert max(d1,d2,bboxerr)<report['tolerance_cm']
   item['meshes'].append({'output_geometry':g['id'],'reference_geometry':r['id'],'reference_path':r['path'],'max_bidirectional_vertex_distance_cm':max(d1,d2),'max_bbox_error_cm':bboxerr,'vertex_count':len(a)})
  report['parts'].append(item)
  print(side,'verified 5 meshes; max vertex error cm',max(g['max_bidirectional_vertex_distance_cm'] for g in item['meshes']))
 assert hashes=={str(p):digest(p) for p in sources}
 report['originals_unchanged']=True
 Path('model-repairs/MODEL-001-validation.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
 print('Original hashes unchanged. Report: model-repairs/MODEL-001-validation.json')
if __name__=='__main__':main()
