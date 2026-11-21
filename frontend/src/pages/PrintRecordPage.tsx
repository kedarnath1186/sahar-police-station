import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { api } from '../api'
import { formatIstDate, statusClass, type Accused } from '../types'

export function PrintRecordPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const [printedAt, setPrintedAt] = useState<string | null>(null)
  const query = useQuery({
    queryKey: ['accused', id],
    queryFn: () => api.get<Accused>(`/api/accused/${id}/`),
  })
  if (query.isPending) return <p className="loading-inline">{t('common.loadingPrint')}</p>
  if (query.isError) return <div className="notice error-notice" role="alert">{query.error.message}</div>
  const record = query.data

  return (
    <section className="print-page">
      <div className="print-actions no-print">
        <button
          type="button"
          className="primary-button"
          onClick={() => {
            setPrintedAt(new Date().toISOString())
            window.setTimeout(() => window.print(), 0)
          }}
        >{t('accused.openPrint')}</button>
      </div>
      <article className="card print-dossier">
        <header className="print-header">
          <img src="/static/img/maharashtra_police_logo.png" alt={t('app.logoAlt')} />
          <div><p>{t('app.force').toUpperCase()}</p><h2>{t('app.station')}</h2><span>{t('app.localStation')}</span></div>
        </header>
        <div className="print-record-heading">
          <span className="record-id">{record.record_id}</span>
          <span className={statusClass(record.location_status)}>
            {t(`status.${record.location_status}`, { defaultValue: record.location_status.replaceAll('_', ' ') })}
          </span>
        </div>
        <h1>{record.full_name}</h1>
        <div className="print-fields">
          <PrintField label={t('accused.mobile')} value={record.formatted_mobile} />
          <PrintField label={t('accused.detailedAddress')} value={record.detailed_address} />
          <PrintField label={t('accused.village')} value={record.village} />
          <PrintField label={t('accused.cityTaluka')} value={`${record.city} / ${record.taluka}`} />
          <PrintField label={`${t('common.district')} / ${t('accused.state')} / ${t('accused.pincode')}`} value={`${record.district}, ${record.state} ${record.pincode}`} />
          <PrintField label={t('accused.coordinates')} value={record.latitude == null || record.longitude == null ? t('print.notSet') : `${record.latitude.toFixed(6)}, ${record.longitude.toFixed(6)}`} />
          <PrintField label={t('accused.accuracy')} value={t(`accuracy.${record.location_accuracy}`, { defaultValue: record.location_accuracy })} />
          <PrintField label={t('accused.registered')} value={formatIstDate(record.created_at)} />
          <PrintField label={t('accused.verificationOfficer')} value={record.verified_by ?? t('print.notVerified')} />
          <PrintField label={t('accused.verifiedAt')} value={formatIstDate(record.verified_at)} />
        </div>
        {record.photos?.length ? (
          <section className="print-photos"><h2>{t('print.photos')}</h2>
            {record.photos.map((photo) => <figure key={photo.id}><img src={photo.image_url} alt={photo.caption || record.full_name} /><figcaption>{photo.caption || photo.location_address}</figcaption></figure>)}
          </section>
        ) : null}
        {printedAt && <footer className="print-meta">{t('print.generated', { date: formatIstDate(printedAt) })}</footer>}
      </article>
    </section>
  )
}

function PrintField({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value || '—'}</strong></div>
}
