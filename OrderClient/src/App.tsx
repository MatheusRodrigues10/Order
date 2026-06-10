import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  DoorOpen,
  Loader2,
  Lock,
  LogOut,
  RefreshCcw,
  Save,
  Settings,
  Table2,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './index.css'

type Dashboard = {
  totalMesas: number
  mesasReservadas: number
  mesasLivres: number
}

type Reserva = {
  mesa: number
  reservadoEm: string
  expiraEm: string
  liberaEm: string
  emLimpeza: boolean
}

type Config = {
  totalMesas: number
  duracaoReservaMinutos: number
  duracaoLimpezaMinutos: number
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const tokenKey = 'reservas_admin_token'

function formatDate(value: string) {
  if (/^\d{2}\/\d{2}\/\d{4}/.test(value)) {
    return value
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatDuration(minutes?: number) {
  if (!minutes) return '-'
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (!hours) return `${remainingMinutes} min`

  return `${hours}:${String(remainingMinutes).padStart(2, '0')}`
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey) ?? '')
  const [email, setEmail] = useState('admin@restaurant.local')
  const [password, setPassword] = useState('')
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [config, setConfig] = useState<Config | null>(null)
  const [mesaManual, setMesaManual] = useState('')
  const [totalMesas, setTotalMesas] = useState('')
  const [duracaoMinutos, setDuracaoMinutos] = useState('')
  const [duracaoLimpezaMinutos, setDuracaoLimpezaMinutos] = useState('')
  const [limpezaAlert, setLimpezaAlert] = useState<Reserva | null>(null)
  const [alertasFechados, setAlertasFechados] = useState<Set<number>>(() => new Set())
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }),
    [token],
  )

  async function request<T>(path: string, options: RequestInit = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers ?? {}),
      },
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(data?.message ?? 'Nao foi possivel concluir a acao')
    }

    return data as T
  }

  const loadData = useCallback(async () => {
    if (!token) return

    setLoading(true)
    setError('')

    try {
      const [dashboardData, reservasData, configData] = await Promise.all([
        request<Dashboard>('/admin/dashboard'),
        request<Reserva[]>('/admin/reservas'),
        request<Config>('/admin/config'),
      ])

      setDashboard(dashboardData)
      setReservas(reservasData)
      setConfig(configData)
      setTotalMesas(String(configData.totalMesas))
      setDuracaoMinutos(String(configData.duracaoReservaMinutos))
      setDuracaoLimpezaMinutos(String(configData.duracaoLimpezaMinutos))

      const reservaEmLimpeza = reservasData.find((reserva) => reserva.emLimpeza && !alertasFechados.has(reserva.mesa))
      if (reservaEmLimpeza) {
        setLimpezaAlert(reservaEmLimpeza)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [token, headers, alertasFechados])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!token) return

    const interval = window.setInterval(() => {
      loadData()
    }, 30000)

    return () => window.clearInterval(interval)
  }, [token, loadData])

  async function handleLogin(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.message ?? 'Login invalido')
      }

      localStorage.setItem(tokenKey, data.accessToken)
      setToken(data.accessToken)
      setPassword('')
      setMessage('Login realizado')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no login')
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem(tokenKey)
    setToken('')
    setDashboard(null)
    setReservas([])
    setConfig(null)
  }

  function closeLimpezaAlert() {
    if (limpezaAlert) {
      setAlertasFechados((current) => new Set(current).add(limpezaAlert.mesa))
    }
    setLimpezaAlert(null)
  }

  async function submitAction(action: () => Promise<unknown>, success: string) {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      await action()
      setMessage(success)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <main className="login-page">
        <section className="login-panel">
          <div className="brand-mark">
            <Table2 size={28} />
          </div>
          <h1>Reservas</h1>
          <form onSubmit={handleLogin} className="stack">
            <label>
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
            </label>
            <label>
              Senha
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
            </label>
            {error && <p className="alert error">{error}</p>}
            <button className="primary-button" disabled={loading} type="submit">
              {loading ? <Loader2 className="spin" size={18} /> : <Lock size={18} />}
              Entrar
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Painel administrativo</p>
          <h1>Reservas de mesas</h1>
        </div>
        <div className="topbar-actions">
          <button className="icon-button" onClick={loadData} title="Atualizar" type="button">
            <RefreshCcw size={18} />
          </button>
          <button className="ghost-button" onClick={logout} type="button">
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </header>

      {(message || error) && (
        <div className={error ? 'notice error' : 'notice success'}>
          {error ? <Lock size={18} /> : <CheckCircle2 size={18} />}
          {error || message}
        </div>
      )}

      <section className="metrics-grid">
        <article className="metric-card">
          <Table2 size={24} />
          <span>Total</span>
          <strong>{dashboard?.totalMesas ?? '-'}</strong>
        </article>
        <article className="metric-card">
          <DoorOpen size={24} />
          <span>Livres</span>
          <strong>{dashboard?.mesasLivres ?? '-'}</strong>
        </article>
        <article className="metric-card reserved">
          <CalendarClock size={24} />
          <span>Reservadas</span>
          <strong>{dashboard?.mesasReservadas ?? '-'}</strong>
        </article>
        <article className="metric-card">
          <Clock3 size={24} />
          <span>Tempo de mesa</span>
          <strong>{formatDuration(config?.duracaoReservaMinutos)}</strong>
        </article>
        <article className="metric-card cleaning">
          <RefreshCcw size={24} />
          <span>Limpeza</span>
          <strong>{formatDuration(config?.duracaoLimpezaMinutos)}</strong>
        </article>
      </section>

      {limpezaAlert && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <section className="modal-panel">
            <button className="icon-button modal-close" onClick={closeLimpezaAlert} title="Fechar" type="button">
              <X size={18} />
            </button>
            <div className="brand-mark warning">
              <Clock3 size={26} />
            </div>
            <h2>Mesa {limpezaAlert.mesa} expirou</h2>
            <p>
              O tempo de uso terminou. A mesa continua reservada para limpeza ate{' '}
              <strong>{formatDate(limpezaAlert.liberaEm)}</strong>.
            </p>
            <button className="primary-button" onClick={closeLimpezaAlert} type="button">
              Entendi
            </button>
          </section>
        </div>
      )}

      <section className="content-grid">
        <div className="panel reservations-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Reservas ativas</p>
              <h2>Mesas ocupadas</h2>
            </div>
            {loading && <Loader2 className="spin muted" size={20} />}
          </div>

          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault()
              submitAction(
                () =>
                  request('/admin/reservas', {
                    method: 'POST',
                    body: JSON.stringify({ mesa: Number(mesaManual) }),
                  }),
                'Reserva criada',
              )
              setMesaManual('')
            }}
          >
            <input
              min="1"
              placeholder="Numero da mesa"
              type="number"
              value={mesaManual}
              onChange={(event) => setMesaManual(event.target.value)}
            />
            <button className="primary-button" type="submit" disabled={loading || !mesaManual}>
              <Table2 size={18} />
              Reservar
            </button>
          </form>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mesa</th>
                  <th>Reserva</th>
                  <th>Uso ate</th>
                  <th>Libera</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {reservas.map((reserva) => (
                  <tr key={reserva.mesa}>
                    <td>{reserva.mesa}</td>
                    <td>{formatDate(reserva.reservadoEm)}</td>
                    <td>{formatDate(reserva.expiraEm)}</td>
                    <td>{formatDate(reserva.liberaEm)}</td>
                    <td>
                      <span className={reserva.emLimpeza ? 'status-pill cleaning' : 'status-pill active'}>
                        {reserva.emLimpeza ? 'Limpeza' : 'Em uso'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="icon-button danger"
                        onClick={() =>
                          submitAction(
                            () => request(`/admin/reservas/${reserva.mesa}`, { method: 'DELETE' }),
                            'Reserva cancelada',
                          )
                        }
                        title="Cancelar reserva"
                        type="button"
                      >
                        <Trash2 size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!reservas.length && (
                  <tr>
                    <td colSpan={6} className="empty-state">
                      Nenhuma reserva ativa
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="panel settings-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Sistema</p>
              <h2>Configuracoes</h2>
            </div>
            <Settings size={21} />
          </div>

          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault()
              submitAction(
                () =>
                  request('/admin/config/mesas', {
                    method: 'PUT',
                    body: JSON.stringify({ totalMesas: Number(totalMesas) }),
                  }),
                'Total de mesas atualizado',
              )
            }}
          >
            <label>
              Total de mesas
              <input min="1" type="number" value={totalMesas} onChange={(event) => setTotalMesas(event.target.value)} />
            </label>
            <button className="secondary-button" disabled={loading} type="submit">
              <Save size={17} />
              Salvar mesas
            </button>
          </form>

          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault()
              submitAction(
                () =>
                  request('/admin/config/expiracao', {
                    method: 'PUT',
                    body: JSON.stringify({ duracaoMinutos: Number(duracaoMinutos) }),
                  }),
                'Expiracao atualizada',
              )
            }}
          >
            <label>
              Duracao em minutos
              <input
                min="1"
                type="number"
                value={duracaoMinutos}
                onChange={(event) => setDuracaoMinutos(event.target.value)}
              />
            </label>
            <button className="secondary-button" disabled={loading} type="submit">
              <Clock3 size={17} />
              Salvar tempo
            </button>
          </form>

          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault()
              submitAction(
                () =>
                  request('/admin/config/limpeza', {
                    method: 'PUT',
                    body: JSON.stringify({ duracaoMinutos: Number(duracaoLimpezaMinutos) }),
                  }),
                'Tempo de limpeza atualizado',
              )
            }}
          >
            <label>
              Limpeza em minutos
              <input
                min="1"
                type="number"
                value={duracaoLimpezaMinutos}
                onChange={(event) => setDuracaoLimpezaMinutos(event.target.value)}
              />
            </label>
            <button className="secondary-button" disabled={loading} type="submit">
              <RefreshCcw size={17} />
              Salvar limpeza
            </button>
          </form>
        </aside>
      </section>
    </main>
  )
}

export default App
