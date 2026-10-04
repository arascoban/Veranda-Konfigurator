import { DRAIN_BOTH_SIDES_ABOVE_MM, frameColors, type FrameColorId, type ProductId } from '../../../catalog/catalog';
import { assemblySpecs } from '../../../features/assembly/spec';
import { MAX_POST_INSET_MM } from '../../../features/assembly/placements';
import { dimensionRange, withDimension, type DimensionKey } from '../../../domain/adjustDimensions';
import type { ConfigurationV1 } from '../../../domain/configuration';
import type { ConfigurationEvaluation } from '../../../domain/evaluateConfiguration';
import { addPost, createMinimumPostLayout, distributePostsEvenly, movePostFromCentimetres, removePost } from '../../../features/viewer/postEditing';
import { de, issueTextDe } from '../../../content/de';
import { Button } from '../../../ui/Button';
import { StatusMessage } from '../../../ui/StatusMessage';
import { InfoTip } from '../../../ui/InfoTip';
import { SectionHead } from '../../../ui/SectionHead';
import { DimensionField } from './DimensionField';


/** Four product lines (V2); only Prime and Premium exist in the catalogue so far. */
const models = [
  { id: 'prime', name: 'Prime', note: 'Pfosten 11 cm' },
  { id: 'premium', name: 'Premium', note: 'Pfosten 13 cm' },
  { id: 'prime-r-plus', name: 'Prime-R Plus', note: 'In Vorbereitung' },
  { id: 'diamond-line', name: 'Diamond Line', note: 'In Vorbereitung' },
] as const;

export function ConstructionSettings({ configuration, evaluation, onChange, onProductChange, selectedPostId = null, onSelectPost }: {
  configuration: ConfigurationV1;
  evaluation: ConfigurationEvaluation;
  onChange: (next: ConfigurationV1) => void;
  onProductChange: (productId: ProductId) => void;
  selectedPostId?: string | null;
  onSelectPost?: (postId: string | null) => void;
}) {
  // At most 100 cm, and the sides keep at least 100 cm of clear depth behind the posts (provisional).
  const maxInset = Math.max(0, Math.min(MAX_POST_INSET_MM, (configuration.dimensionsMm.depth ?? 0) - 1000 - 135));
  const firstInvalid = evaluation.issues.find((issue) => issue.kind === 'invalid');
  const fieldError = (field: DimensionKey) => {
    const issue = evaluation.issues.find((item) => item.kind === 'invalid' && item.field === `dimensionsMm.${field}`);
    return issue ? issueTextDe[issue.code] ?? 'Bitte prüfen Sie dieses Maß.' : undefined;
  };
  const setDimension = (field: DimensionKey, value: number | null) => {
    const next = withDimension(configuration, field, value);
    if (next) onChange(next);
  };
  const widthMm = configuration.dimensionsMm.width;
  const posts = configuration.postCenters ?? [];
  // The customer looks at the model from the garden: numbering and positions run from the garden-left end,
  // which is the x = W end of the inside-based axis used in the configuration.
  const gardenOrder = posts.map((post, index) => ({ post, index })).reverse();
  const fromGardenLeft = (xMm: number) => (widthMm ?? 0) - xMm;
  const commitPosts = (next: ConfigurationV1['postCenters']) => { if (next) onChange({ ...configuration, postCenters: next }); };
  const selectedIndex = posts.findIndex((post) => post.id === selectedPostId);
  const drainBoth = widthMm !== null && widthMm > DRAIN_BOTH_SIDES_ABOVE_MM;

  return (
    <section className="v2-construction" aria-label="Konstruktion">
      <div className="v2-subhead"><h3>Modell</h3><span>4 Modelle</span></div>
      <div className="v2-model-row" role="radiogroup" aria-label="Modell wählen">
        {models.map((model) => {
          const available = model.id === 'prime' || model.id === 'premium';
          return (
            <button key={model.id} type="button" role="radio" className="v2-model-card" aria-checked={configuration.productId === model.id}
              disabled={!available} onClick={() => { if (model.id === 'prime' || model.id === 'premium') onProductChange(model.id); }}>
              <span className="v2-model-card__picture" aria-hidden="true">{model.name}</span>
              <span className="v2-row-text"><strong>{model.name}</strong><small>{model.note}</small></span>
            </button>
          );
        })}
      </div>

      <div className="v2-subhead"><h3>Maße</h3></div>
      {/* Always shown (owner, 3 Oct 2026): the letters A–E of the fields below refer to it. */}
      <figure className="measure-figure">
        <img src={`${import.meta.env.BASE_URL}images/masse-abcde.jpg`} alt="Maßskizze: A Tiefe, B Breite, C Gesamthöhe, D Höhe hinten, E Höhe vorne" />
      </figure>
      <div className="form-grid form-grid--pairs">
        {(['width', 'depth', 'frontHeight', 'rearHeight'] as DimensionKey[]).map((field) => {
          const range = dimensionRange(configuration, field);
          return <DimensionField key={field} label={de.dimensions[field].label} valueMm={configuration.dimensionsMm[field]}
            error={fieldError(field)} minimumMm={range?.minMm} maximumMm={range?.maxMm}
            onValueChange={(value) => setDimension(field, value)} />;
        })}
      </div>
      <div className="v2-readonly-row">
        <span className="v2-row-text"><strong>Neigung<InfoTip text={'Die Neigung bleibt erhalten, wenn Sie Tiefe oder Höhe vorne ändern. Über die Höhe hinten ändern Sie die Neigung; zulässig sind 5° bis 12°.'
          + (evaluation.issues.some((issue) => issue.code === 'roof_attachment_offsets_provisional') ? ' Die Montagebezüge sind vorläufig.' : '')} /></strong>
          <small>berechnet, zulässig 5–12°</small></span>
        <strong className={`v2-readonly-row__value ${evaluation.slope?.status === 'calculated' && !evaluation.slope.withinLimit ? 'v2-error-text' : ''}`}>
          {evaluation.slope?.status === 'calculated' ? `${formatNumber(evaluation.slope.degrees)}°` : '–'}</strong>
      </div>
      <div className="v2-readonly-row">
        <span className="v2-row-text"><strong>Gesamthöhe (C)</strong><small>bis Oberkante Wandprofil</small></span>
        <strong className="v2-readonly-row__value">{configuration.dimensionsMm.rearHeight === null ? '–'
          : `${formatNumber((configuration.dimensionsMm.rearHeight + assemblySpecs[configuration.productId].wallProfileHeightMm) / 10)} cm`}</strong>
      </div>

      <div className="v2-subhead"><h3>Farbe der Profile<InfoTip text="Farbe aller Aluminiumprofile. Dichtungen, Glas und Ablaufrohr bleiben unverändert." /></h3></div>
      <div className="v2-color-grid" role="radiogroup" aria-label="Farbe der Aluminiumprofile">
        {(Object.keys(frameColors) as FrameColorId[]).map((id) => (
          <button key={id} type="button" role="radio" className="v2-color-card" aria-checked={configuration.frameColor === id}
            onClick={() => onChange({ ...configuration, frameColor: id })}>
            <span className="v2-swatch-dot v2-swatch-dot--large" style={{ background: frameColors[id].hex }} aria-hidden="true" />
            <span className="v2-row-text"><strong>{frameColors[id].ral}</strong><small>{frameColors[id].nameDe}</small></span>
          </button>
        ))}
      </div>

      <SectionHead title="Pfosten" chip="ab linkem Rinnenende, vom Garten" info="Pfosten im Modell antippen und entlang der Rinne ziehen oder hier die Position eingeben (Achsmaß ab dem linken Rinnenende, vom Garten aus gesehen). Pfosten 1 steht vom Garten aus links." />
      {posts.length ? (
        <div className="post-list">
          {gardenOrder.map(({ post, index }, number) => (
            <div className={`post-row ${post.id === selectedPostId ? 'post-row--selected' : ''}`} key={post.id}>
              <button type="button" className="post-row__name" aria-pressed={post.id === selectedPostId}
                onClick={() => onSelectPost?.(post.id === selectedPostId ? null : post.id)}>Pfosten {number + 1}</button>
              <span className="post-row__control">
                <input type="text" inputMode="decimal" aria-label={`Position von Pfosten ${number + 1} ab links in cm`}
                  key={`${post.id}:${post.xMm}`} defaultValue={formatNumber(fromGardenLeft(post.xMm) / 10)}
                  onFocus={() => onSelectPost?.(post.id)}
                  onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
                  onBlur={(event) => {
                    if (widthMm === null) return;
                    const entered = Number(event.currentTarget.value.trim().replace(',', '.'));
                    const insideCm = Number.isFinite(entered) ? (widthMm / 10 - entered).toFixed(1) : event.currentTarget.value;
                    const next = movePostFromCentimetres(configuration.productId, widthMm, posts, index, insideCm);
                    event.currentTarget.value = formatNumber(fromGardenLeft((next ?? posts)[index].xMm) / 10);
                    if (next) commitPosts(next);
                  }} />
                <span>cm</span>
              </span>
            </div>
          ))}
          {evaluation.issues.filter((issue) => issue.kind === 'invalid' && issue.field === 'postCenters').map((issue) => (
            <StatusMessage key={issue.code} tone="error">{issueTextDe[issue.code] ?? 'Bitte prüfen Sie die Pfostenanordnung.'}</StatusMessage>
          ))}
        </div>
      ) : <StatusMessage tone="info" title="Pfosten noch nicht gesetzt">
        Die Mindestanordnung wird aus Produkt und Breite bestimmt.
      </StatusMessage>}
      <div className="post-actions">
        <Button size="small" disabled={widthMm === null || !addPost(configuration.productId, widthMm, posts)}
          onClick={() => widthMm !== null && commitPosts(addPost(configuration.productId, widthMm, posts))}>Pfosten hinzufügen</Button>
        <Button size="small" disabled={widthMm === null || selectedIndex < 0 || !removePost(configuration.productId, widthMm, posts, selectedIndex)}
          onClick={() => { if (widthMm !== null) { commitPosts(removePost(configuration.productId, widthMm, posts, selectedIndex)); onSelectPost?.(null); } }}>Pfosten entfernen</Button>
        <Button size="small" disabled={widthMm === null || !distributePostsEvenly(configuration.productId, widthMm, posts)}
          onClick={() => widthMm !== null && commitPosts(distributePostsEvenly(configuration.productId, widthMm, posts))}>Felder gleichmäßig verteilen</Button>
        <Button size="small" disabled={widthMm === null || !createMinimumPostLayout(configuration.productId, widthMm)}
          onClick={() => widthMm !== null && commitPosts(createMinimumPostLayout(configuration.productId, widthMm))}>Mindestanordnung</Button>
      </div>

      {/* Posts moved in towards the wall (4 Oct 2026): up to 100 cm, then a static carrier runs under the rafters. */}
      <div className="v2-subhead"><h3>Pfosten nach innen<InfoTip text="Alle Pfosten rücken gemeinsam bis zu 100 cm in Richtung Wand. Ein Statikträger über die ganze Breite trägt dann die Sparren; ein Zusatzrohr führt das Wasser von der Rinne zum Ablaufpfosten. Die Felder vorne enden unter dem Statikträger." /></h3>
        <span>{configuration.postInsetMm ? 'mit Statikträger' : 'an der Rinne'}</span></div>
      <DimensionField label="Einzug ab Rinne" valueMm={configuration.postInsetMm} minimumMm={0} maximumMm={maxInset}
        onValueChange={(value) => { if (value !== null) onChange({ ...configuration, postInsetMm: Math.max(0, Math.min(maxInset, Math.round(value))) }); }} />

      {configuration.productId === 'prime' && <div className="option-row">
        <span className="option-row__label">Pfostendeckel<InfoTip text="Gerader oder halber Deckel am Prime-Pfosten." /></span>
        <div className="product-switch" role="group" aria-label="Pfostendeckel">
          {(['gerade', 'halb'] as const).map((style) => (
            <button key={style} type="button" className="product-switch__option" aria-pressed={configuration.postCapStyle === style}
              onClick={() => onChange({ ...configuration, postCapStyle: style })}>{style === 'gerade' ? 'Gerade' : 'Halb'}</button>
          ))}
        </div>
      </div>}
      <div className="option-row">
        <span className="option-row__label">Wasserablauf<InfoTip text={drainBoth
          ? 'Ab 800 cm Breite erhält jeder äußere Pfosten einen Ablauf.'
          : 'Am äußeren Pfosten, vom Garten aus gesehen. Der Ablauf zeigt zum Garten.'} /></span>
        <div className="product-switch" role="group" aria-label="Seite des Wasserablaufs">
          {(['left', 'right'] as const).map((side) => (
            <button key={side} type="button" className="product-switch__option" aria-pressed={configuration.drainSide === side} disabled={drainBoth}
              onClick={() => onChange({ ...configuration, drainSide: side })}>{side === 'left' ? 'Links' : 'Rechts'}</button>
          ))}
        </div>

      </div>
      {firstInvalid && <p className="sr-only">{issueTextDe[firstInvalid.code] ?? 'Die Konfiguration enthält ungültige Angaben.'}</p>}
    </section>
  );
}

/** Value the customer cannot type (calculated); optional "i" with an explanation. */
function ReadOnlyValue({ label, value, limit, info, tone }: { label: string; value: string; limit?: string; info?: string; tone?: 'error' }) {
  return (
    <div className={`dimension-field readonly-value ${tone === 'error' ? 'dimension-field--error' : ''}`}>
      <div className="dimension-field__label-row">
        <span className="dimension-field__label">{label}{info && <InfoTip text={info} />}</span>
        {limit && <span className="dimension-field__limit">{limit}</span>}
      </div>
      <div className="dimension-field__control readonly-value__control" aria-readonly="true">
        <output className="dimension-field__input">{value}</output>
      </div>
    </div>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1, useGrouping: false }).format(value);
}
