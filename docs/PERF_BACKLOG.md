Performance Monitoring Backlog

Goals

- Store long-term perf artifacts in durable storage (S3) and index them for trend analysis.
- Build a dashboard (Grafana/Netdata) to visualize mixedCount, elapsedMs, heapDelta across runs.
- Add self-hosted runners for stable perf baselines.
- Automate nightly scheduled perf runs with artifact retention and a cleanup policy.

Tasks

1. S3 artifact upload
   - Create an S3 bucket and IAM role with write permissions for CI.
   - Add secrets to GitHub Actions (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET`).
   - Update `perf.yml` to `aws s3 cp` the artifact directory with a timestamped prefix.
   - Store metadata (commit SHA, run id, branch) alongside artifacts.

2. Baseline management
   - Add a small service or Lambda to validate incoming baselines and store them in a registry with tags.
   - Provide an API for listing baselines and retrieving metrics.

3. Dashboard
   - Export metrics (mixedCount, elapsedMs, heapDelta) to a time-series DB (Prometheus or InfluxDB) via a CI step.
   - Build Grafana dashboards with alerting for regressions above set thresholds.

4. Self-hosted runners
   - Provision stable runners with consistent CPU/ram.
   - Add runner labels and route perf workflow to those runners.

5. Notifications
   - Configure Slack/email notifications for perf regressions and baseline updates.

Notes

- Prioritize S3 storage + scheduled runs first; dashboards and self-hosted runners are medium-term.
- Security: rotate keys and scope IAM permissions narrowly.
