---
'grafana-zabbix': patch
---

Fix the Triggers query editor crashing when Count by is set to Problems on Zabbix 7.0 or newer. The Proxy dropdown now falls back to the proxy name when the API does not return a host field, as the Problems query editor already does.
