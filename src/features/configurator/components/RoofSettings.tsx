import { roofMaterials } from '../../../catalog/catalog';
import type { ConfigurationV1 } from '../../../domain/configuration';
import type { ConfigurationEvaluation } from '../../../domain/evaluateConfiguration';
import { calculateRoofBayGeometry, minimumRoofBayCount } from '../../../domain/geometry/roof';
import { de, issueTextDe } from '../../../content/de';
import { Icon } from '../../../ui/Icon';
import { StatusMessage } from '../../../ui/StatusMessage';

export function RoofSettings({ configuration, evaluation, onChange }: {
  configuration: ConfigurationV1;
  evaluation: ConfigurationEvaluation;
  onChange: (next: ConfigurationV1) => void;
}) {
  const roof = evaluation.roof;
  const lowerLimit = configuration.dimensionsMm.width === null ? null
    : minimumRoofBayCount(configuration.dimensionsMm.width, configuration.roofMaterialId);
  const canIncrease = Boolean(roof && calculateCandidate(configuration, roof.bayCount + 1));
  const changeCount = (delta: number) => {
    if (!roof) return;
    const next = roof.bayCount + delta;
    if (next < 1 || !calculateCandidate(configuration, next)) return;
    onChange({ ...configuration, roofBayCount: next });
  };
  const selectMaterial = (roofMaterialId: ConfigurationV1['roofMaterialId']) => onChange({
    ...configuration, roofMaterialId, roofBayCount: null,
  });
  return (
    <section aria-labelledby="roof-heading">
      <h3 id="roof-heading" className="section-heading">Dacheindeckung</h3>
      <div className="material-options" role="group" aria-label="Dachmaterial auswählen">
        {(Object.keys(roofMaterials) as ConfigurationV1['roofMaterialId'][]).map((id) => (
          <button key={id} type="button" className="material-option" aria-pressed={configuration.roofMaterialId === id}
            onClick={() => selectMaterial(id)}>
            <span className="material-option__visual"><Icon name={id === 'glass' ? 'roof' : 'sun'} /></span>
            <span className="material-option__label">{de.roofMaterials[id]}</span>
            <span className="material-option__sub">Max. {materialLabel(roofMaterials[id].maxPanelWidthMm)} cm Plattenbreite</span>
          </button>
        ))}
      </div>

      <h3 className="section-subheading">Dachfelder</h3>
      {roof ? <>
        <dl className="roof-stat-list">
          <div className="roof-stat"><dt>Maximale Plattenbreite</dt><dd>{materialLabel(roof.panelWidthLimitMm)} cm</dd></div>
          <div className="roof-stat"><dt>Felder</dt><dd>{roof.bayCount}</dd></div>
          <div className="roof-stat"><dt>Träger</dt><dd>{roof.supportCount}</dd></div>
        </dl>
        <div className="number-stepper" aria-label="Anzahl der Dachfelder">
          <button className="number-stepper__button" type="button" aria-label="Dachfeld entfernen"
            disabled={lowerLimit === null || roof.bayCount <= lowerLimit} onClick={() => changeCount(-1)}><Icon name="minus" /></button>
          <output className="number-stepper__value">{roof.bayCount}</output>
          <button className="number-stepper__button" type="button" aria-label="Dachfeld hinzufügen"
            disabled={!canIncrease} onClick={() => changeCount(1)}><Icon name="plus" /></button>
        </div>
        {roof.bayCount > (lowerLimit ?? roof.bayCount)
          ? <p className="field-hint">Zusätzliche Dachfelder können den Preis erhöhen; die Preisliste fehlt noch.</p>
          : <p className="field-hint">Ausgewählte Mindestaufteilung nach der Plattenbreite.</p>}
        {roof.reasons.map((reason) => <StatusMessage key={reason} tone="error">{issueTextDe[reason]}</StatusMessage>)}
      </> : <StatusMessage tone="info">Geben Sie zuerst eine gültige Breite ein, um Dachfelder zu berechnen.</StatusMessage>}
    </section>
  );
}

function calculateCandidate(configuration: ConfigurationV1, count: number): boolean {
  const width = configuration.dimensionsMm.width;
  if (width === null || !Number.isSafeInteger(width) || width <= 0) return false;
  return calculateRoofBayGeometry(width, configuration.roofMaterialId, count)?.valid ?? false;
}

function materialLabel(widthMm: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(widthMm / 10);
}
