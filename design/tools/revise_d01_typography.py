from pathlib import Path
import xml.etree.ElementTree as ET

SVG_NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', SVG_NS)
ROOT = Path(__file__).resolve().parent.parent
SCREEN_FILES = ['D01-MASAUSTU.svg', 'D01-TABLET.svg', 'D01-TELEFON.svg']

for name in SCREEN_FILES:
    path = ROOT / name
    tree = ET.parse(path)
    root = tree.getroot()
    changed = 0
    for text in root.iter(f'{{{SVG_NS}}}text'):
        raw_size = text.get('font-size')
        if raw_size is None:
            continue
        size = float(raw_size.removesuffix('px'))
        target = 12 if size < 12 else 14 if size < 14 else size
        if target != size:
            text.set('font-size', f'{target:g}')
            changed += 1
    tree.write(path, encoding='utf-8', xml_declaration=True)
    print(f'{name}: raised {changed} small labels to 12–14 px')
