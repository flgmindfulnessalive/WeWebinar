import { Document, Page, View, Text, StyleSheet, Svg, Path, Line } from "@react-pdf/renderer";

const INK = "#16162a";
const BODY = "#4a4a63";
const MUTED = "#8785a0";
const ACCENT = "#4f46e5";
const ACCENT_DEEP = "#3730a3";
const ACCENT_10 = "#e9e8fb";
const RULE = "#e3e2ef";
const FILL = "#f1f0f9";
const PAPER = "#fefeff";

export type ReportKpi = { label: string; value: string; sublabel?: string };
export type ReportFunnelStep = { count: number; countLabel: string; label: string; pctOfFirst: number };
export type ReportRetentionPoint = { minute: number; pct: number };
export type ReportBar = { label: string; sublabel?: string; valueLabel: string; pct: number };
export type ReportPollGroup = { question: string; bars: ReportBar[] };

export type WebinarReportData = {
  webinarTitle: string;
  presenterName: string | null;
  scheduleModeLabel: string;
  dataRangeLabel: string;
  generatedAtLabel: string;
  kpis: ReportKpi[];
  funnel: ReportFunnelStep[];
  retention: ReportRetentionPoint[];
  retentionCaption: string;
  scheduleBars: ReportBar[];
  ctaBars: ReportBar[];
  pollGroups: ReportPollGroup[];
  labels: {
    funnelTitle: string;
    retentionTitle: string;
    scheduleTitle: string;
    ctaClicksTitle: string;
    pollResultsTitle: string;
    noScheduleData: string;
    noCtaData: string;
    noPollData: string;
    footerBrand: string;
    footerConfidential: string;
    pageOf: (page: number, total: number) => string;
  };
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: PAPER,
    paddingTop: 34,
    paddingBottom: 30,
    paddingHorizontal: 38,
    fontFamily: "IBM Plex Sans",
    fontSize: 9,
    color: BODY,
  },
  mastheadBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  wordmark: {
    fontFamily: "IBM Plex Sans",
    fontWeight: 600,
    fontSize: 10.5,
    color: ACCENT,
  },
  wordmarkInk: { color: INK },
  genMeta: {
    fontFamily: "Roboto Mono",
    fontSize: 7.5,
    letterSpacing: 0.5,
    color: MUTED,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: "Newsreader",
    fontWeight: 500,
    fontSize: 21,
    color: INK,
    marginBottom: 7,
    lineHeight: 1.2,
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  badge: {
    fontFamily: "Roboto Mono",
    fontSize: 7,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: ACCENT,
    backgroundColor: ACCENT_10,
    borderRadius: 8,
    paddingVertical: 2.5,
    paddingHorizontal: 7,
    fontWeight: 600,
  },
  subText: { fontSize: 8.5, color: MUTED },
  dot: { fontSize: 8.5, color: RULE, marginHorizontal: 6 },
  rule: { borderBottomWidth: 1, borderBottomColor: RULE, marginBottom: 15 },
  kpiRow: { flexDirection: "row", marginBottom: 16 },
  kpi: {
    flex: 1,
    borderWidth: 1,
    borderColor: RULE,
    borderTopWidth: 2.5,
    borderTopColor: ACCENT,
    borderRadius: 3,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginRight: 8,
  },
  kpiLast: { marginRight: 0 },
  kpiLabel: {
    fontSize: 7,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: MUTED,
    fontWeight: 500,
  },
  kpiValue: {
    fontFamily: "Roboto Mono",
    fontWeight: 600,
    fontSize: 16,
    color: ACCENT_DEEP,
    marginTop: 3,
  },
  kpiSub: { fontSize: 7, color: MUTED, marginTop: 2 },
  sectionTitle: {
    fontSize: 8.5,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: INK,
    marginBottom: 8,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  section: { marginBottom: 16 },
  funnelRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  funnelLabelBox: { width: 90 },
  funnelCount: { fontSize: 8.5, fontWeight: 600, color: INK },
  funnelLabel: { fontSize: 7.5, color: BODY },
  funnelTrack: { flex: 1, height: 13, backgroundColor: FILL, borderRadius: 2 },
  funnelFill: {
    height: 13,
    backgroundColor: ACCENT,
    borderRadius: 2,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 5,
  },
  funnelFillLabel: { fontFamily: "Roboto Mono", fontSize: 7, color: "#ffffff", fontWeight: 600 },
  chartCaption: { fontSize: 7.5, color: MUTED, marginTop: 4 },
  barRow: { marginBottom: 8 },
  barTopRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  barName: { fontSize: 8.5, color: INK, fontWeight: 500 },
  barSub: { fontSize: 7, color: MUTED },
  barValue: { fontFamily: "Roboto Mono", fontSize: 7.5, color: ACCENT_DEEP, fontWeight: 600 },
  barTrack: { height: 7, backgroundColor: FILL, borderRadius: 2 },
  barFill: { height: 7, backgroundColor: ACCENT, borderRadius: 2 },
  pollQuestion: { fontSize: 8.5, color: INK, fontWeight: 500, marginBottom: 7 },
  emptyNote: { fontSize: 8, color: MUTED },
  footerRow: {
    marginTop: "auto",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: RULE,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: MUTED,
  },
});

function Masthead({ generatedAtLabel }: { generatedAtLabel: string }) {
  return (
    <View style={styles.mastheadBar}>
      <Text style={styles.wordmark}>
        We<Text style={styles.wordmarkInk}>Webinars</Text>
      </Text>
      <Text style={styles.genMeta}>{generatedAtLabel}</Text>
    </View>
  );
}

function Footer({ left, page, total, pageOf }: { left: string; page: number; total: number; pageOf: (p: number, t: number) => string }) {
  return (
    <View style={styles.footerRow} fixed>
      <Text>{left}</Text>
      <Text>{pageOf(page, total)}</Text>
    </View>
  );
}

function Funnel({ steps }: { steps: ReportFunnelStep[] }) {
  const max = steps.length > 0 ? steps[0].count || 1 : 1;
  return (
    <View>
      {steps.map((step, i) => {
        const widthPct = Math.max(4, (step.count / max) * 100);
        const opacity = 1 - i * 0.18;
        return (
          <View key={i} style={styles.funnelRow}>
            <View style={styles.funnelLabelBox}>
              <Text style={styles.funnelCount}>{step.countLabel}</Text>
              <Text style={styles.funnelLabel}>{step.label}</Text>
            </View>
            <View style={styles.funnelTrack}>
              <View
                style={{
                  ...styles.funnelFill,
                  width: `${widthPct}%`,
                  backgroundColor: `rgba(79,70,229,${Math.max(0.35, opacity)})`,
                }}
              >
                <Text style={styles.funnelFillLabel}>{step.pctOfFirst}%</Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const RET_W = 536;
const RET_H = 110;
const RET_PAD_L = 26;
const RET_PAD_R = 4;
const RET_PAD_T = 6;
const RET_PAD_B = 4;

function RetentionCurve({ points, caption }: { points: ReportRetentionPoint[]; caption: string }) {
  if (points.length < 2) {
    return <Text style={styles.emptyNote}>{caption}</Text>;
  }
  const plotW = RET_W - RET_PAD_L - RET_PAD_R;
  const plotH = RET_H - RET_PAD_T - RET_PAD_B;
  const maxMinute = points[points.length - 1].minute || 1;
  const xFor = (m: number) => RET_PAD_L + (m / maxMinute) * plotW;
  const yFor = (pct: number) => RET_PAD_T + plotH - (pct / 100) * plotH;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(p.minute)} ${yFor(p.pct)}`).join(" ");
  const areaPath = `${linePath} L ${xFor(points[points.length - 1].minute)} ${yFor(0)} L ${xFor(points[0].minute)} ${yFor(0)} Z`;
  const gridPcts = [0, 25, 50, 75, 100];

  return (
    <View>
      <Svg width={RET_W} height={RET_H} viewBox={`0 0 ${RET_W} ${RET_H}`}>
        {gridPcts.map((pct) => (
          <Line
            key={pct}
            x1={RET_PAD_L}
            x2={RET_W - RET_PAD_R}
            y1={yFor(pct)}
            y2={yFor(pct)}
            stroke={RULE}
            strokeWidth={1}
          />
        ))}
        <Path d={areaPath} fill={ACCENT} fillOpacity={0.14} />
        <Path d={linePath} stroke={ACCENT} strokeWidth={2} fill="none" />
      </Svg>
      <Text style={styles.chartCaption}>{caption}</Text>
    </View>
  );
}

function Bars({ bars, emptyLabel }: { bars: ReportBar[]; emptyLabel: string }) {
  if (bars.length === 0) return <Text style={styles.emptyNote}>{emptyLabel}</Text>;
  const max = Math.max(...bars.map((b) => b.pct), 1);
  return (
    <View>
      {bars.map((bar, i) => (
        <View key={i} style={styles.barRow}>
          <View style={styles.barTopRow}>
            <Text style={styles.barName}>
              {bar.label}
              {bar.sublabel ? <Text style={styles.barSub}>  {bar.sublabel}</Text> : null}
            </Text>
            <Text style={styles.barValue}>{bar.valueLabel}</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={{ ...styles.barFill, width: `${Math.max(3, (bar.pct / max) * 100)}%` }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function WebinarReportDocument({ data }: { data: WebinarReportData }) {
  const hasPage2 = data.scheduleBars.length > 0 || data.ctaBars.length > 0 || data.pollGroups.length > 0;
  const totalPages = hasPage2 ? 2 : 1;

  return (
    <Document title={data.webinarTitle}>
      <Page size="LETTER" style={styles.page}>
        <Masthead generatedAtLabel={data.generatedAtLabel} />

        <Text style={styles.title}>{data.webinarTitle}</Text>
        <View style={styles.subRow}>
          <Text style={styles.badge}>{data.scheduleModeLabel}</Text>
          {data.presenterName && (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.subText}>{data.presenterName}</Text>
            </>
          )}
          <Text style={styles.dot}>·</Text>
          <Text style={styles.subText}>{data.dataRangeLabel}</Text>
        </View>
        <View style={styles.rule} />

        <View style={styles.kpiRow}>
          {data.kpis.map((kpi, i) => (
            <View key={i} style={{ ...styles.kpi, ...(i === data.kpis.length - 1 ? styles.kpiLast : {}) }}>
              <Text style={styles.kpiLabel}>{kpi.label}</Text>
              <Text style={styles.kpiValue}>{kpi.value}</Text>
              {kpi.sublabel && <Text style={styles.kpiSub}>{kpi.sublabel}</Text>}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{data.labels.funnelTitle}</Text>
          <Funnel steps={data.funnel} />
        </View>

        <View style={{ ...styles.section, marginBottom: 0 }}>
          <Text style={styles.sectionTitle}>{data.labels.retentionTitle}</Text>
          <RetentionCurve points={data.retention} caption={data.retentionCaption} />
        </View>

        <Footer left={data.labels.footerBrand} page={1} total={totalPages} pageOf={data.labels.pageOf} />
      </Page>

      {hasPage2 && (
        <Page size="LETTER" style={styles.page}>
          <Masthead generatedAtLabel={data.generatedAtLabel} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{data.labels.scheduleTitle}</Text>
            <Bars bars={data.scheduleBars} emptyLabel={data.labels.noScheduleData} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{data.labels.ctaClicksTitle}</Text>
            <Bars bars={data.ctaBars} emptyLabel={data.labels.noCtaData} />
          </View>

          <View style={{ ...styles.section, marginBottom: 0 }}>
            <Text style={styles.sectionTitle}>{data.labels.pollResultsTitle}</Text>
            {data.pollGroups.length === 0 ? (
              <Text style={styles.emptyNote}>{data.labels.noPollData}</Text>
            ) : (
              data.pollGroups.map((group, i) => (
                <View key={i} style={{ marginBottom: i === data.pollGroups.length - 1 ? 0 : 10 }}>
                  <Text style={styles.pollQuestion}>{group.question}</Text>
                  <Bars bars={group.bars} emptyLabel={data.labels.noPollData} />
                </View>
              ))
            )}
          </View>

          <Footer left={data.labels.footerConfidential} page={2} total={totalPages} pageOf={data.labels.pageOf} />
        </Page>
      )}
    </Document>
  );
}
