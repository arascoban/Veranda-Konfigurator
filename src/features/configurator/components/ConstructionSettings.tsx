import { DRAIN_BOTH_SIDES_ABOVE_MM, frameColors, postSections, type FrameColorId } from '../../../catalog/catalog';
import { assemblySpecs } from '../../../features/assembly/spec';
import { dimensionRange, withDimension, type DimensionKey } from '../../../domain/adjustDimensions';
import type { ConfigurationV1 } from '../../../domain/configuration';
import type { ConfigurationEvaluation } from '../../../domain/evaluateConfiguration';
import { addPost, createMinimumPostLayout, distributePostsEvenly, movePostFromCentimetres, removePost } from '../../../features/viewer/postEditing';
import { de, issueTextDe } from '../../../content/de';
import { Button } from '../../../ui/Button';
import { StatusMessage } from '../../../ui/StatusMessage';
import { DimensionField } from './DimensionField';


export function ConstructionSettings({ configuration, evaluation, onChange, selectedPostId = null, onSelectPost }: {
  configuration: ConfigurationV1;
  evaluation: ConfigurationEvaluation;
  onChange: (next: ConfigurationV1) => void;
  selectedPostId?: string | null;
  onSelectPost?: (postId: string | null) => void;
}) {
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
  const section = postSections[configuration.productId];

  return (
    <section aria-labelledby="construction-heading">
      <h3 id="construction-heading" className="section-heading">Maße der Überdachung</h3>
      <div className="form-grid">
        {(['width', 'depth'] as DimensionKey[]).map((field) => {
          const range = dimensionRange(configuration, field);
          return <DimensionField key={field} label={de.dimensions[field].label} valueMm={configuration.dimensionsMm[field]}
            error={fieldError(field)} minimumMm={range?.minMm} maximumMm={range?.maxMm} wide
            onValueChange={(value) => setDimension(field, value)} />;
        })}
      </div>
      <figure className="measure-figure">
        <img src={`${import.meta.env.BASE_URL}images/masse-abcde.jpg`} alt="Maßskizze: A Tiefe, B Breite, C Gesamthöhe, D Höhe hinten, E Höhe vorne" />
      </figure>
      <div className="form-grid form-grid--pairs">
        <DimensionField label={de.dimensions.frontHeight.label} valueMm={configuration.dimensionsMm.frontHeight}
          error={fieldError('frontHeight')} minimumMm={dimensionRange(configuration, 'frontHeight')?.minMm}
          maximumMm={dimensionRange(configuration, 'frontHeight')?.maxMm} onValueChange={(value) => setDimension('frontHeight', value)} />
        <ReadOnlyValue label="Neigung" limit="5–12°"
          value={evaluation.slope?.status === 'calculated' ? `${formatNumber(evaluation.slope.degrees)}°` : '–'}
          tone={evaluation.slope?.status === 'calculated' && !evaluation.slope.withinLimit ? 'error' : undefined}
          info={'Die Neigung bleibt erhalten, wenn Sie Tiefe oder Höhe vorne ändern. Über die Höhe hinten ändern Sie die Neigung; zulässig sind 5° bis 12°.'
            + (evaluation.issues.some((issue) => issue.code === 'roof_attachment_offsets_provisional') ? ' Die Montagebezüge sind vorläufig.' : '')} />
        <DimensionField label={de.dimensions.rearHeight.label} valueMm={configuration.dimensionsMm.rearHeight}
          error={fieldError('rearHeight')} minimumMm={dimensionRange(configuration, 'rearHeight')?.minMm}
          maximumMm={dimensionRange(configuration, 'rearHeight')?.maxMm} onValueChange={(value) => setDimension('rearHeight', value)} />
        <ReadOnlyValue label="Gesamthöhe (C)"
          value={configuration.dimensionsMm.rearHeight === null ? '–'
            : `${formatNumber((configuration.dimensionsMm.rearHeight + assemblySpecs[configuration.productId].wallProfileHeightMm) / 10)} cm`} />
      </div>

      <h3 className="section-subheading">Farbe</h3>
      <div className="color-swatches" role="radiogroup" aria-label="Farbe der Aluminiumprofile">
        {(Object.keys(frameColors) as FrameColorId[]).map((id) => (
          <button key={id} type="button" role="radio" className="color-swatch" aria-checked={configuration.frameColor === id}
            onClick={() => onChange({ ...configuration, frameColor: id })}>
            <span className="color-swatch__disc" style={{ '--swatch': frameColors[id].hex } as React.CSSProperties} aria-hidden="true" />
            <span className="color-swatch__name">{frameColors[id].ral}<br />{frameColors[id].nameDe}</span>
          </button>
        ))}
      </div>

      <h3 className="section-subheading">Pfosten</h3>
      <p className="field-hint">Pfosten im Modell antippen und entlang der Rinne ziehen oder hier die Position eingeben
        (Achsmaß ab dem linken Rinnenende, vom Garten aus gesehen).
        Querschnitt {de.products[configuration.productId]}: {section.alongGutterMm / 10} × {section.towardsGardenMm / 10} cm.</p>
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

      {configuration.productId === 'prime' && <div className="option-row">
        <span className="option-row__label">Pfostendeckel</span>
        <div className="product-switch" role="group" aria-label="Pfostendeckel">
          {(['gerade', 'halb'] as const).map((style) => (
            <button key={style} type="button" className="product-switch__option" aria-pressed={configuration.postCapStyle === style}
              onClick={() => onChange({ ...configuration, postCapStyle: style })}>{style === 'gerade' ? 'Gerade' : 'Halb'}</button>
          ))}
        </div>
      </div>}
      <div className="option-row">
        <span className="option-row__label">Wasserablauf</span>
        <div className="product-switch" role="group" aria-label="Seite des Wasserablaufs">
          {(['left', 'right'] as const).map((side) => (
            <button key={side} type="button" className="product-switch__option" aria-pressed={configuration.drainSide === side} disabled={drainBoth}
              onClick={() => onChange({ ...configuration, drainSide: side })}>{side === 'left' ? 'Links' : 'Rechts'}</button>
          ))}
        </div>
        <span className="field-hint">{drainBoth
          ? 'Ab 800 cm Breite erhält jeder äußere Pfosten einen Ablauf.'
          : 'Am äußeren Pfosten, vom Garten aus gesehen. Der Ablauf zeigt zum Garten.'}</span>
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
        <span className="dimension-field__label">{label}{info && <span className="info-dot" tabIndex={0} role="note" aria-label={info} data-tip={info}>i</span>}</span>
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
