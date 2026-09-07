import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  useActivateStudioMutation,
  useDeleteStudioMutation,
  useStudiosQuery,
  useSuspendStudioMutation,
} from '@/hooks/useStudioQueries';
import { StudioStatus } from '@/types/studio.types';
import { ROUTES } from '@/routes/paths';
import { message } from 'antd';
import { StudioTable } from '@/features/studios/components/StudioTable';
import { brand } from '@/styles/brand';
import './StudiosListPage.css';

const STATUS_FILTERS: { label: string; value: StudioStatus }[] = [
  { label: 'Active', value: StudioStatus.ACTIVE },
  { label: 'Suspended', value: StudioStatus.SUSPENDED },
  { label: 'Expired', value: StudioStatus.EXPIRED },
];

export const StudiosListPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StudioStatus | undefined>();

  const queryParams = useMemo(
    () => ({ page, limit, search: search || undefined, status }),
    [page, limit, search, status],
  );

  const { data, isLoading } = useStudiosQuery(queryParams);
  const suspendMutation = useSuspendStudioMutation();
  const activateMutation = useActivateStudioMutation();
  const deleteMutation = useDeleteStudioMutation();

  const applySearch = () => {
    setSearch(searchInput.trim());
    setPage(1);
  };

  const handleSuspend = async (id: string) => {
    await suspendMutation.mutateAsync(id);
    message.success('Studio suspended');
  };

  const handleActivate = async (id: string) => {
    await activateMutation.mutateAsync(id);
    message.success('Studio activated');
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
    message.success('Studio deleted');
  };

  const total = data?.pagination.total ?? 0;

  return (
    <div className="studios-page">
      <header className="studios-page__hero">
        <div className="studios-page__hero-glow" aria-hidden />
        <p className="studios-page__eyebrow">{brand.name} network</p>
        <div className="studios-page__hero-row">
          <div>
            <h1>Studios</h1>
            <p className="studios-page__lede">
              Search, filter, and manage every studio on the platform.
            </p>
          </div>
          <Link className="studios-page__btn studios-page__btn--primary" to={ROUTES.STUDIO_CREATE}>
            New studio
          </Link>
        </div>
        <div className="studios-page__stats" aria-label="List summary">
          <div>
            <span>Showing</span>
            <strong>{data?.items.length ?? 0}</strong>
          </div>
          <div>
            <span>Total</span>
            <strong>{total}</strong>
          </div>
          <div>
            <span>Page</span>
            <strong>
              {data?.pagination.page ?? page}
              <small> / {Math.max(1, Math.ceil(total / (data?.pagination.limit ?? limit)))}</small>
            </strong>
          </div>
        </div>
      </header>

      <section className="studios-page__toolbar" aria-label="Filters">
        <label className="studios-page__search">
          <span className="visually-hidden">Search studios</span>
          <input
            type="search"
            placeholder="Search by name, code, email…"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              if (!e.target.value) {
                setSearch('');
                setPage(1);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applySearch();
            }}
          />
          <button type="button" onClick={applySearch}>
            Search
          </button>
        </label>

        <div className="studios-page__filters" role="group" aria-label="Status filter">
          <button
            type="button"
            className={`studios-page__chip${!status ? ' studios-page__chip--on' : ''}`}
            onClick={() => {
              setStatus(undefined);
              setPage(1);
            }}
          >
            All
          </button>
          {STATUS_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`studios-page__chip${status === option.value ? ' studios-page__chip--on' : ''}`}
              onClick={() => {
                setStatus(option.value);
                setPage(1);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <StudioTable
        studios={data?.items ?? []}
        loading={isLoading}
        pagination={{
          page: data?.pagination.page ?? page,
          limit: data?.pagination.limit ?? limit,
          total,
        }}
        onPageChange={(nextPage, pageSize) => {
          setPage(nextPage);
          setLimit(pageSize);
        }}
        onSuspend={handleSuspend}
        onActivate={handleActivate}
        onDelete={handleDelete}
        onOpen={(id) => navigate(ROUTES.STUDIO_DETAILS.replace(':id', id))}
        onEdit={(id) => navigate(ROUTES.STUDIO_EDIT.replace(':id', id))}
      />
    </div>
  );
};
