import { useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { choiceLabel, formatIstDate, statusClass, type Accused, type FormChoices, type Paginated } from '../types'
import { EmptyState } from '../components/EmptyState'

export function AccusedTablePage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [district, setDistrict] = useState('')
  const [status, setStatus] = useState('')
  const [hasPhotos, setHasPhotos] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 })
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }])
  const ordering = sorting[0] ? `${sorting[0].desc ? '-' : ''}${sorting[0].id}` : '-created_at'
  const records = useQuery({
    queryKey: ['accused', 'table', search, district, status, hasPhotos, pagination, ordering],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        page_size: String(pagination.pageSize),
        ordering,
      })
      if (search.trim()) params.set('search', search.trim())
      if (district) params.set('district', district)
      if (status) params.set('status', status)
      if (hasPhotos) params.set('has_photos', hasPhotos)
      return api.get<Paginated<Accused>>(`/api/accused/table/?${params}`)
    },
  })
  const choices = useQuery({
    queryKey: ['form-choices'],
    queryFn: () => api.get<FormChoices>('/api/choices/'),
  })
  const columns = useMemo<ColumnDef<Accused>[]>(() => [
    { accessorKey: 'record_id', header: 'Record ID', enableSorting: false },
    {
      accessorKey: 'full_name',
      header: 'Full Name',
      cell: ({ row }) => <Link className="table-name" to={`/accused/${row.original.id}`}>{row.original.full_name}</Link>,
    },
    { accessorKey: 'formatted_mobile', header: 'Mobile', enableSorting: false },
    { accessorKey: 'district', header: 'District' },
    {
      accessorKey: 'location_status',
      header: 'Location Status',
      enableSorting: false,
      cell: ({ getValue }) => {
        const value = getValue<string>()
        return <span className={statusClass(value)}>{choiceLabel(choices.data?.statuses, value)}</span>
      },
    },
    {
      accessorKey: 'location_accuracy',
      header: 'Accuracy',
      enableSorting: false,
      cell: ({ getValue }) => {
        const value = getValue<string>()
        return <span className={`accuracy-chip accuracy-${value}`}>{choiceLabel(choices.data?.accuracies, value)}</span>
      },
    },
    { accessorKey: 'photo_count', header: 'Photos', enableSorting: false },
    {
      accessorKey: 'created_at',
      header: 'Registered (IST)',
      cell: ({ getValue }) => formatIstDate(getValue<string>()),
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="table-actions">
          <Link to={`/accused/${row.original.id}`}>View</Link>
          <Link to={`/accused/${row.original.id}/edit`}>Edit</Link>
        </div>
      ),
    },
  ], [choices.data?.accuracies, choices.data?.statuses])

  const table = useReactTable({
    data: records.data?.results ?? [],
    columns,
    pageCount: records.data?.total_pages ?? 0,
    state: { pagination, sorting },
    manualPagination: true,
    manualSorting: true,
    onPaginationChange: setPagination,
    onSortingChange: (update) => {
      setSorting((current) => typeof update === 'function' ? update(current) : update)
      setPagination((current) => ({ ...current, pageIndex: 0 }))
    },
    getCoreRowModel: getCoreRowModel(),
  })

  function resetPage() {
    setPagination((current) => ({ ...current, pageIndex: 0 }))
  }

  return (
    <section>
      <div className="page-heading heading-with-action">
        <div><p className="eyebrow">{t('app.force')}</p><h2>{t('nav.tableView')}</h2></div>
        <Link className="primary-button link-button" to="/accused/new">+ {t('nav.addAccused')}</Link>
      </div>
      <div className="filter-toolbar table-filters">
        <label className="search-field"><span>Search records</span>
          <input value={search} onChange={(event) => { setSearch(event.target.value); resetPage() }} placeholder="Name, mobile, address" />
        </label>
        <label><span>District</span>
          <select value={district} onChange={(event) => { setDistrict(event.target.value); resetPage() }}>
            <option value="">All districts</option>
            {choices.data?.districts.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label><span>Status</span>
          <select value={status} onChange={(event) => { setStatus(event.target.value); resetPage() }}>
            <option value="">All statuses</option>
            {choices.data?.statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label><span>Photographs</span>
          <select value={hasPhotos} onChange={(event) => { setHasPhotos(event.target.value); resetPage() }}>
            <option value="">Any</option><option value="yes">With photos</option><option value="no">Without photos</option>
          </select>
        </label>
      </div>
      {records.isPending && <p className="loading-inline">Loading table…</p>}
      {records.isError && <div className="notice error-notice" role="alert">{records.error.message}</div>}
      {records.data && (
        <>
          <div className="table-summary muted-copy">{records.data.count} records · Page {records.data.page} of {Math.max(records.data.total_pages, 1)}</div>
          <div className="responsive-table" role="region" aria-label="Accused records table" tabIndex={0}>
            <table className="records-table">
              <thead>
                {table.getHeaderGroups().map((group) => (
                  <tr key={group.id}>
                    {group.headers.map((header) => (
                      <th key={header.id} scope="col">
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <button type="button" className="sort-button" onClick={header.column.getToggleSortingHandler()}>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getIsSorted() === 'asc' ? ' ↑' : header.column.getIsSorted() === 'desc' ? ' ↓' : ''}
                          </button>
                        ) : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {!records.data.results.length && (
              <EmptyState
                title="No records found"
                description="No accused records match the selected filter criteria."
                actionLabel={`+ ${t('nav.addAccused')}`}
                actionTo="/accused/new"
              />
            )}
          </div>
          <div className="table-cards">
            {records.data.results.map((record) => (
              <article className="accused-card" key={record.id}>
                <div className="record-card-top"><span className="record-id">{record.record_id}</span><span className={statusClass(record.location_status)}>{choiceLabel(choices.data?.statuses, record.location_status)}</span></div>
                <h3><Link to={`/accused/${record.id}`}>{record.full_name}</Link></h3>
                <p>{record.formatted_mobile}</p><p className="muted-copy">{record.district}</p>
                <div className="record-card-bottom"><span>{formatIstDate(record.created_at)}</span><Link to={`/accused/${record.id}/edit`}>Edit record</Link></div>
              </article>
            ))}
          </div>
          <div className="pagination table-pagination">
            <label className="page-size"><span>Rows</span>
              <select value={pagination.pageSize} onChange={(event) => table.setPageSize(Number(event.target.value))}>
                {[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
            <button type="button" className="secondary-button" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</button>
            <span>Page {pagination.pageIndex + 1} of {Math.max(records.data.total_pages, 1)}</span>
            <button type="button" className="secondary-button" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</button>
          </div>
        </>
      )}
    </section>
  )
}
