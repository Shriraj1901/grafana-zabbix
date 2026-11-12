import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { TriggersQueryEditor } from './TriggersQueryEditor';

const metricPickerSpy = jest.fn();

jest.mock('../../../components', () => ({
  MetricPicker: (props: any) => {
    metricPickerSpy(props);
    return null;
  },
}));

jest.mock('@grafana/runtime', () => ({
  getTemplateSrv: jest.fn(() => ({
    getVariables: jest.fn(() => []),
  })),
}));

jest.mock('@grafana/ui', () => ({
  Combobox: () => <div />,
  InlineField: ({ children }: any) => <div>{children}</div>,
  InlineFieldRow: ({ children }: any) => <div>{children}</div>,
  InlineFormLabel: ({ children }: any) => <div>{children}</div>,
  InlineSwitch: () => <div />,
  Input: (props: any) => <input {...props} />,
}));

const baseQuery: any = {
  countTriggersBy: 'problems',
  group: { filter: '' },
  host: { filter: '' },
  proxy: { filter: '' },
  application: { filter: '' },
  itemTag: { filter: '' },
  item: { filter: '' },
  trigger: { filter: '' },
  tags: { filter: '' },
  options: { minSeverity: 0, count: false },
};

const buildDatasource = (overrides: Partial<any> = {}) => {
  const zabbix = {
    getAllGroups: jest.fn().mockResolvedValue([]),
    getAllHosts: jest.fn().mockResolvedValue([]),
    getAllApps: jest.fn().mockResolvedValue([]),
    getAllItems: jest.fn().mockResolvedValue([]),
    getProxies: jest.fn().mockResolvedValue([]),
    isZabbix54OrHigher: jest.fn().mockResolvedValue(true),
    supportsApplications: jest.fn(() => true),
    ...overrides,
  };

  return {
    zabbix,
    interpolateVariablesInQueries: jest.fn((queries: any[]) => queries),
  };
};

const findProxyOptions = () =>
  metricPickerSpy.mock.calls
    .map((call) => call[0])
    .find((props) => props?.placeholder === 'Proxy name' && props?.options)?.options;

describe('TriggersQueryEditor', () => {
  beforeEach(() => {
    metricPickerSpy.mockClear();
  });

  describe('Proxy options', () => {
    it('uses the proxy name when host is missing (Zabbix 7.0+)', async () => {
      const datasource = buildDatasource({
        getProxies: jest.fn().mockResolvedValue([{ proxyid: '1', name: 'proxy-a' }]),
      });

      render(<TriggersQueryEditor query={baseQuery} datasource={datasource as any} onChange={jest.fn()} />);

      await waitFor(() => {
        expect(findProxyOptions()).toEqual([{ value: 'proxy-a', label: 'proxy-a' }]);
      });
    });

    it('uses the proxy host when present (Zabbix < 7.0)', async () => {
      const datasource = buildDatasource({
        getProxies: jest.fn().mockResolvedValue([{ proxyid: '1', host: 'legacy-proxy' }]),
      });

      render(<TriggersQueryEditor query={baseQuery} datasource={datasource as any} onChange={jest.fn()} />);

      await waitFor(() => {
        expect(findProxyOptions()).toEqual([{ value: 'legacy-proxy', label: 'legacy-proxy' }]);
      });
    });

    it('never produces options with an undefined label', async () => {
      const datasource = buildDatasource({
        getProxies: jest.fn().mockResolvedValue([{ proxyid: '1' }, { proxyid: '2', name: 'proxy-b' }]),
      });

      render(<TriggersQueryEditor query={baseQuery} datasource={datasource as any} onChange={jest.fn()} />);

      await waitFor(() => {
        expect(findProxyOptions()).toEqual([
          { value: '', label: '' },
          { value: 'proxy-b', label: 'proxy-b' },
        ]);
      });
    });
  });
});
