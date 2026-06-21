# Reservas de Mesas API

API para controle de reservas ativas de mesas usando Node.js, Express, TypeScript, Prisma ORM e PostgreSQL/Neon.

## Requisitos

- Node.js 22+
- PostgreSQL ou Neon
- npm

## Configuracao

```bash
cp .env.example .env
npm install
npm run prisma:deploy
npm run seed
npm run dev
```

Swagger:

```text
http://localhost:3000/docs
```

Health check:

```text
GET /health
```

## Variaveis principais

- `DATABASE_URL`: URL PostgreSQL/Neon com SSL.
- `JWT_SECRET`: segredo para assinar JWT.
- `ADMIN_EMAIL`: email do admin criado no seed.
- `ADMIN_PASSWORD`: senha do admin criado no seed.
- `DEFAULT_DURACAO_RESERVA_MINUTOS`: duracao padrao da reserva em minutos.
- `DEFAULT_DURACAO_LIMPEZA_MINUTOS`: tempo adicional em que a mesa continua reservada para limpeza.
- `DEFAULT_API_PIN`: PIN inicial da API externa.

## Autenticacao

Admin:

```http
POST /admin/login
Content-Type: application/json

{
  "email": "seu-email@exemplo.com",
  "password": "sua-senha"
}
```

Use o token nos endpoints administrativos:

```http
Authorization: Bearer <accessToken>
```

API externa:

```http
X-API-PIN: 123456
```

## Endpoints

API externa:

- `GET /api/now`
- `GET /api/status`
- `GET /api/availability`
- `POST /api/reservations`

Admin:

- `POST /admin/login`
- `GET /admin/dashboard`
- `GET /admin/reservations`
- `POST /admin/reservations`
- `DELETE /admin/reservations/:id`
- `GET /admin/tables`
- `POST /admin/tables/:numero/block`
- `DELETE /admin/tables/:numero/block`
- `GET /admin/operating-hours`
- `PUT /admin/operating-hours/:dia/:turno`
- `DELETE /admin/operating-hours/:dia/:turno`
- `GET /admin/config`
- `PUT /admin/config/tables`
- `PUT /admin/config/capacity`
- `PUT /admin/config/duration`
- `PUT /admin/config/cleanup`
- `PUT /admin/config/hours`
- `PUT /admin/config/pin`

## Docker

```bash
docker compose up --build
```
