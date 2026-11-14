---
'grafana-zabbix': patch
---

Fix the Text query text filter never matching when it contains a dashboard variable. The interpolated filter is now used as a plain regular expression instead of being wrapped as `/^...$/`.
