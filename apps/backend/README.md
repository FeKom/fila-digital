# fila-digital-backend

## Running

### Development

```bash
yarn && yarn dev
```

### Production

```sh
yarn && yarn build && yarn start
```

Starting the server locally within production environment (w/ database access):

```sh
NODE_ENV=production DATABASE_PASSWORD='' yarn dev
```

> remember to change log_level for production to debug issues...

## Migrations

If you need to run migrations for production database, we need to pass the correctly `NODE_ENV` variable and the database password, example:

```sh
NODE_ENV=production DATABASE_PASSWORD=xpto yarn migration:up
```

### Up

```sh
yarn migration:up
```
### Down

```sh
yarn migrations:down # here you need to run for each migration created;
```

### Database

### First run 

```sh
docker exec -it {id} bin/bash
```

### Connect Locally

```sh
psql -U fila-digital-user -d fila-digital
```
### List Tables

```sh
\dt
```
## Database Relations 

<div align="center"><img src="docs/relationship.png" alt="imagem"></div>