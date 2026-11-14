import { ZabbixDatasource } from '../datasource';

jest.mock('../tracking', () => ({
  trackRequest: jest.fn(),
}));

jest.mock('../zabbix/zabbix', () => ({
  Zabbix: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@grafana/runtime', () => {
  class MockDataSourceWithBackend {
    instanceSettings: any;
    constructor(settings: any) {
      this.instanceSettings = settings;
    }
  }

  return {
    DataSourceWithBackend: MockDataSourceWithBackend,
    config: {
      buildInfo: { env: 'development' },
      bootData: { user: { isGrafanaAdmin: false, orgRole: 'Editor' } },
    },
    getTemplateSrv: jest.fn(() => ({
      replace: (value: any) => value,
      variableExists: () => false,
    })),
    getDataSourceSrv: jest.fn(() => ({
      getInstanceSettings: () => undefined,
    })),
    getBackendSrv: jest.fn(),
    HealthCheckError: class {},
    TemplateSrv: class {},
  };
});

describe('ZabbixDatasource.interpolateVariablesInQueries', () => {
  const instanceSettings: any = { id: 1, name: 'test-ds', uid: 'test-ds-uid', jsonData: {} };

  // Minimal stand-in for Grafana's TemplateSrv: replaces $name / ${name:raw} with the variable value run
  // through the supplied format function, the way templateSrv.replace() does for a single value variable.
  const buildDatasource = (variables: Record<string, string>) => {
    const ds = new ZabbixDatasource(instanceSettings);
    (ds as any).templateSrv = {
      replace: (target: string, _scopedVars: any, format?: (value: string) => string) =>
        (target ?? '').replace(/\$\{(\w+)(?::\w+)?\}|\$(\w+)/g, (match, braced, plain) => {
          const value = variables[braced ?? plain];
          if (value === undefined) {
            return match;
          }
          return format ? format(value) : value;
        }),
    };
    return ds;
  };

  const interpolateTextFilter = (ds: ZabbixDatasource, textFilter: string) =>
    ds.interpolateVariablesInQueries([{ refId: 'A', textFilter } as any], {})[0].textFilter;

  describe('textFilter', () => {
    const client = 'E5:D9:EA:D7:D5:EA';
    const logLine = `UP ${client} ssid=ThisNetworkHasNoWires ch=116 rssi=0 if=phy1-ap0`;

    it('leaves a text filter without variables untouched', () => {
      const ds = buildDatasource({ client });

      expect(interpolateTextFilter(ds, 'Linux (.*)')).toBe('Linux (.*)');
    });

    it('interpolates a variable into a pattern that still works as a RegExp', () => {
      const ds = buildDatasource({ client });

      const filter = interpolateTextFilter(ds, '.*$client.*');

      expect(filter).toBe(`.*${client}.*`);
      expect(new RegExp(filter).exec(logLine)?.[0]).toBe(logLine);
    });

    it('does not wrap a text filter that is only a variable in /^...$/', () => {
      const ds = buildDatasource({ client });

      const filter = interpolateTextFilter(ds, '${client:raw}');

      expect(filter).toBe(client);
      expect(new RegExp(filter).test(logLine)).toBe(true);
    });

    it('escapes regex characters in the variable value', () => {
      const ds = buildDatasource({ host: 'router.1' });

      expect(interpolateTextFilter(ds, 'host=$host')).toBe('host=router\\.1');
    });
  });
});
