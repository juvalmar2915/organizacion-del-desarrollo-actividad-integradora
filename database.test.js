const { Client } = require('pg');
const {
  /**
   * Recuperamos el esquema esperado
   *
   * Para una primer etapa, se recomienda importar la propiedad
   * "baseFields" reenombrandola a "expectedFields"
   */
  baseFields: expectedFields
} = require('./schema_base');

describe('Test database', () => {
  /**
   * Variables globales usadas por diferentes tests
   */
  let client;

  /**
   * Generamos la configuracion con la base de datos y
   * hacemos la consulta sobre los datos de la tabla "users"
   *
   * Se hace en la etapa beforeAll para evitar relizar la operación
   * en cada test
   */
  beforeAll(async () => {
    client = new Client({
      connectionString: process.env.DATABASE_URL
    });
    await client.connect();
  });

  /**
   * Cerramos la conexion con la base de datos
   */
  afterAll(async () => {
    await client.end();
  });

  /**
   * Validamos el esquema de la base de datos
   */
  describe('Validate database schema', () => {
    /**
     * Variable donde vamos a almacenar los campos
     * recuperados de la base de datos
     */
    let fields;
    let result;

    /**
     * Generamos un objeto para simplificar el acceso en los test
     */
    beforeAll(async () => {
      /**
       * Consulta para recuperar la información de la tabla
       * "users"
       */
      result = await client.query(
        `SELECT
          column_name, data_type
        FROM
          information_schema.columns
        WHERE
          table_name = $1::text`,
        ['users']
      );

      fields = result.rows.reduce((acc, field) => {
        acc[field.column_name] = field.data_type;
        return acc;
      }, {});
    });

    describe('Validate fields name', () => {
      /**
       * Conjunto de tests para validar que los campos esperados se
       * encuentren presentes
       */
      test.each(expectedFields)('Validate field $name', ({ name }) => {
        expect(Object.keys(fields)).toContain(name);
      });
    });

    describe('Validate fields type', () => {
      /**
       * Conjunto de tests para validar que los campos esperados sean
       * del tipo esperado
       */
      test.each(expectedFields)('Validate field $name to be type "$type"', ({ name, type }) => {
        expect(fields[name]).toBe(type);
      });
    });
  });

  describe('Validate insertion', () => {
    afterEach(async () => {
      await client.query('TRUNCATE users');
    });

    test('Insert a valid user', async () => {
      let result = await client.query(
        `INSERT INTO
        users (email, username, birthdate, city, first_name, last_name, password, enabled)
        VALUES ('user@example.com', 'user', '2024-01-02', 'La Plata', 'Juan', 'Pérez', 'securepass123', true)`
      );

      expect(result.rowCount).toBe(1);

      result = await client.query('SELECT * FROM users');

      const user = result.rows[0];
      const userCreatedAt = new Date(user.created_at);
      const currentDate = new Date();

      expect(user.email).toBe('user@example.com');
      expect(user.first_name).toBe('Juan');
      expect(user.last_name).toBe('Pérez');
      expect(user.password).toBe('securepass123');
      expect(user.enabled).toBe(true);
      expect(userCreatedAt.getFullYear()).toBe(currentDate.getFullYear());
    });

    test('Insert a user with an invalid email', async () => {
      const query = `INSERT INTO
                    users (email, username, birthdate, city, first_name, last_name, password, enabled)
                    VALUES ('user', 'user', '2024-01-02', 'La Plata', 'Juan', 'Pérez', 'securepass123', true)`;

      await expect(client.query(query)).rejects.toThrow('users_email_check');
    });

    test('Insert a user with an invalid birthdate', async () => {
      const query = `INSERT INTO
                     users (email, username, birthdate, city)
                     VALUES ('user@example.com', 'user', 'invalid_date', 'La Plata')`;

      await expect(client.query(query)).rejects.toThrow('invalid input syntax for type date');
    });

    test('Insert a user without city', async () => {
      const query = `INSERT INTO
                     users (email, username, birthdate)
                     VALUES ('user@example.com', 'user', '2024-01-02')`;

      await expect(client.query(query)).rejects.toThrow('null value in column "city"');
    });

    //nuevos tests para campos agregados:

    test('Insert user with empty first_name', async () => {
      const query = `
        INSERT INTO users (email, username, birthdate, city, first_name, last_name, password, enabled)
        VALUES ('user1@example.com', 'user1', '2000-01-01', 'La Plata', '', 'Apellido', '123', true)
      `;
      await expect(client.query(query)).resolves.toBeTruthy();
    });

    test('Insert user with too long first_name', async () => {
      const longName = 'A'.repeat(31);
      const query = `
        INSERT INTO users (email, username, birthdate, city, first_name, last_name, password, enabled)
        VALUES ('user2@example.com', 'user2', '2000-01-01', 'La Plata', '${longName}', 'Apellido', '123', true)
      `;
      await expect(client.query(query)).rejects.toThrow();
    });

    test('Insert user without last_name', async () => {
      const query = `
        INSERT INTO users (email, username, birthdate, city, first_name, password, enabled)
        VALUES ('user3@example.com', 'user3', '2000-01-01', 'La Plata', 'Nombre', '123', true)
      `;
      await expect(client.query(query)).rejects.toThrow('null value in column "last_name"');
    });

    test('Insert user with long password', async () => {
      const longPassword = 'A'.repeat(255);
      const query = `
        INSERT INTO users (email, username, birthdate, city, first_name, last_name, password, enabled)
        VALUES ('user4@example.com', 'user4', '2000-01-01', 'La Plata', 'Nombre', 'Apellido', '${longPassword}', true)
      `;
      await expect(client.query(query)).resolves.toBeTruthy();
    });

    test('Insert user with null password', async () => {
      const query = `
        INSERT INTO users (email, username, birthdate, city, first_name, last_name, enabled)
        VALUES ('user5@example.com', 'user5', '2000-01-01', 'La Plata', 'Nombre', 'Apellido', true)
      `;
      await expect(client.query(query)).rejects.toThrow('null value in column "password"');
    });

    test('Insert user with enabled false', async () => {
      const query = `
        INSERT INTO users (email, username, birthdate, city, first_name, last_name, password, enabled)
        VALUES ('user6@example.com', 'user6', '2000-01-01', 'La Plata', 'Nombre', 'Apellido', '123', false)
      `;
      await expect(client.query(query)).resolves.toBeTruthy();
    });

    test('Insert user with NULL in enabled', async () => {
      const query = `
        INSERT INTO users (email, username, birthdate, city, first_name, last_name, password)
        VALUES ('user7@example.com', 'user7', '2000-01-01', 'La Plata', 'Nombre', 'Apellido', '123')
      `;
      await expect(client.query(query)).rejects.toThrow('null value in column "enabled"');
    });

    test('Insert user with future last_access_time', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const query = `
        INSERT INTO users (email, username, birthdate, city, first_name, last_name, password, enabled, last_access_time)
        VALUES ('user8@example.com', 'user8', '2000-01-01', 'La Plata', 'Nombre', 'Apellido', '123', true, '${futureDate.toISOString()}')
      `;
      await expect(client.query(query)).resolves.toBeTruthy();
    });

    test('Insert user with updated_at null', async () => {
      const query = `
        INSERT INTO users (email, username, birthdate, city, first_name, last_name, password, enabled, updated_at)
        VALUES ('user9@example.com', 'user9', '2000-01-01', 'La Plata', 'Nombre', 'Apellido', '123', true, NULL)
      `;
      await expect(client.query(query)).resolves.toBeTruthy();
    });

  });
});
