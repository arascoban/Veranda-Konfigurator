import { MAX_WIDTH_MM, MIN_DEPTH_MM, MIN_WIDTH_MM, postSections, roofMaterials } from '../../../catalog/catalog';
import type { ConfigurationV1 } from '../../../domain/configuration';
import type { ConfigurationEvaluation } from '../../../domain/evaluateConfiguration';
import { de, issueTextDe } from '../../../content/de';
import { Icon } from '../../../ui/Icon';
import { StatusMessage } from '../../../ui/StatusMessage';
import { DimensionField } from './DimensionField';

type DimensionKey = keyof ConfigurationV1['dimensionsMm'];
const fields: DimensionKey[] = ['width', 'depth', 'rearHeight', 'frontHeight'];

export function ConstructionSettings({ configuration, evaluation, onChange, onEditPosts }: {
  configuration: ConfigurationV1;
  evaluation: ConfigurationEvaluation;
  onChange: (next: ConfigurationV1) => void;
  onEditPosts?: () => void;
}) {
  const firstInvalid = evaluation.issues.find((issue) => issue.kind === 'invalid');
  const fieldError = (field: DimensionKey) => {
    const issue = evaluation.issues.find((item) => item.kind === 'invalid' && item.field === `dimensionsMm.${field}`);
    return issue ? issueTextDe[issue.code] ?? 'Bitte prüfen Sie dieses Maß.' : undefined;
  };
  const maximum = (field: DimensionKey): number | undefined => field === 'width' ? MAX_WIDTH_MM
    : field === 'depth' ? roofMaterials[configuration.roofMaterialId].maxDepthMm : undefined;
  const minimum = (field: DimensionKey): number | undefined => field === 'width' ? MIN_WIDTH_MM : field === 'depth' ? MIN_DEPTH_MM : undefined;
  const setDimension = (field: DimensionKey, value: number | null) => onChange({
    ...configuration,
    dimensionsMm: { ...configuration.dimensionsMm, [field]: value },
  });
  return (
    <section aria-labelledby="construction-heading">
      <h3 id="construction-heading" className="section-heading">Maße der Überdachung</h3>
      <div className="form-grid">
        {fields.map((field, index) => (
          <DimensionField key={field} label={de.dimensions[field].label} valueMm={configuration.dimensionsMm[field]}
            help={de.dimensions[field].help} error={fieldError(field)} maximumMm={maximum(field)} minimumMm={minimum(field)}
            wide={index < 2} onValueChange={(value) => setDimension(field, value)} />
        ))}
      </div>
      <div className="measurement-reference" aria-label="Messpunkte der Höhen">
        <div className="measurement-reference__item" aria-current="true">
          <strong><Icon className="inline-icon" name="roof" /> Hinten</strong>
          <span>Bis zur Unterkante des Wandprofils</span>
        </div>
        <div className="measurement-reference__item">
          <strong><Icon className="inline-icon" name="roof" /> Vorne</strong>
          <span>Bis zur Unterkante der Regenrinne</span>
        </div>
      </div>
      <div className="slope-status">
        {evaluation.slope?.status === 'calculated'
          ? <StatusMessage tone={evaluation.slope.withinLimit ? 'success' : 'error'} title="Dachneigung">
            {formatNumber(evaluation.slope.degrees)}° · {evaluation.slope.withinLimit ? 'innerhalb von 5° bis 12°' : 'außerhalb von 5° bis 12°'}
            {evaluation.issues.some((issue) => issue.code === 'roof_attachment_offsets_provisional') && ' · vorläufige Montagebezüge'}
          </StatusMessage>
          : <StatusMessage tone="warning" title="Dachneigung noch nicht bestätigt">
            {issueTextDe.roof_attachment_offsets_not_supplied}
          </StatusMessage>}
      </div>
      <h3 className="section-subheading">Trägeranordnung</h3>
      {configuration.postCenters?.length ? (
        <div className="post-list">
          {configuration.postCenters.map((post, index) => (
            <div className="post-row" key={post.id}>
              <span className="post-row__name">Träger {index + 1}</span>
              <span className="post-row__control" aria-label={`Position von Träger ${index + 1}`}>
                <span>{formatNumber(post.xMm / 10)}</span><span>cm</span>
              </span>
            </div>
          ))}
          {evaluation.issues.filter((issue) => issue.kind === 'invalid' && issue.field === 'postCenters').map((issue) => (
            <StatusMessage key={issue.code} tone="error">{issueTextDe[issue.code] ?? 'Bitte prüfen Sie die Trägeranordnung.'}</StatusMessage>
          ))}
          <p className="field-hint">Die Achsenposition wird vom linken Rinnenende aus gemessen. Trägerquerschnitt {de.products[configuration.productId]}: {postSections[configuration.productId].alongGutterMm / 10} × {postSections[configuration.productId].towardsGardenMm / 10} cm.</p>
        </div>
      ) : <StatusMessage tone="info" title="Trägerpositionen noch offen">
        Wählen Sie eine Anordnung in der 3D-Ansicht. Die Mindestanordnung wird aus Produkt und Breite bestimmt.
      </StatusMessage>}
      {firstInvalid && <p className="sr-only">{issueTextDe[firstInvalid.code] ?? 'Die Konfiguration enthält ungültige Angaben.'}</p>}
      <div className="construction-actions">
        <button className="text-action" type="button" onClick={onEditPosts} disabled={!onEditPosts}>
          Träger im Modell bearbeiten <Icon name="arrow-right" />
        </button>
      </div>
    </section>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(value);
}
