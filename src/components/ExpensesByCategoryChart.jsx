"use client";
import { PieChart } from "@mui/x-charts/PieChart";
import { useDrawingArea } from "@mui/x-charts/hooks";
import { styled } from "@mui/material/styles";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import LinearProgress, { linearProgressClasses } from "@mui/material/LinearProgress";

const COLORS = [
  "#0ea5e9", // sky blue
  "#f97316", // orange
  "#8b5cf6", // violet
  "#22c55e", // green
  "#eab308", // yellow
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f43f5e", // rose
  "#a78bfa", // purple light
  "#84cc16", // lime
];

const StyledText = styled("text", {
  shouldForwardProp: (prop) => prop !== "variant",
})(({ theme }) => ({
  textAnchor: "middle",
  dominantBaseline: "central",
  fill: (theme.vars || theme).palette.text.secondary,
  variants: [
    { props: { variant: "primary" }, style: { fontSize: theme.typography.h5.fontSize } },
    { props: ({ variant }) => variant !== "primary", style: { fontSize: theme.typography.body2.fontSize } },
    { props: { variant: "primary" }, style: { fontWeight: theme.typography.h5.fontWeight } },
    { props: ({ variant }) => variant !== "primary", style: { fontWeight: theme.typography.body2.fontWeight } },
  ],
}));

function PieCenterLabel({ primaryText, secondaryText }) {
  const { width, height, left, top } = useDrawingArea();
  const primaryY = top + height / 2 - 10;
  const secondaryY = primaryY + 24;
  return (
    <>
      <StyledText variant="primary" x={left + width / 2} y={primaryY}>
        {primaryText}
      </StyledText>
      <StyledText variant="secondary" x={left + width / 2} y={secondaryY}>
        {secondaryText}
      </StyledText>
    </>
  );
}

export function ExpensesByCategoryChart({ transactions }) {
  const expensesByCategory = {};
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    const cat = t.category_name || "Uncategorized";
    expensesByCategory[cat] =
      (expensesByCategory[cat] || 0) + Math.abs(parseFloat(t.amount || 0));
  }

  const entries = Object.entries(expensesByCategory)
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value);

  const total = entries.reduce((s, e) => s + e.value, 0);
  const pieData = entries.map(({ name, value }) => ({ label: name, value }));
  const legendEntries = entries.filter(({ value }) =>
    total > 0 ? (value / total) * 100 >= 3 : true,
  );

  return (
    <Card
      variant="outlined"
      sx={{ display: "flex", flexDirection: "column", gap: "8px", flexGrow: 1, height: "100%" }}
    >
      <CardContent>
        <Typography component="h2" variant="subtitle2" gutterBottom>
          Expenses by Category
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <PieChart
            colors={COLORS}
            margin={{ left: 80, right: 80, top: 80, bottom: 80 }}
            series={[
              {
                data: pieData.length > 0 ? pieData : [{ label: "No data", value: 1 }],
                innerRadius: 75,
                outerRadius: 100,
                paddingAngle: 0,
                highlightScope: { fade: "global", highlight: "item" },
              },
            ]}
            height={260}
            width={260}
            hideLegend
          >
            <PieCenterLabel
              primaryText={`$${total.toFixed(2)}`}
              secondaryText="Expenses"
            />
          </PieChart>
        </Box>

        {entries.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
            No expenses for this period
          </Typography>
        ) : (
          legendEntries.map(({ name, value }) => {
            const i = entries.findIndex((e) => e.name === name);
            return (
              <Stack key={name} direction="row" sx={{ alignItems: "center", gap: 2, pb: 2 }}>
                <Stack sx={{ gap: 1, flexGrow: 1 }}>
                  <Stack
                    direction="row"
                    sx={{ justifyContent: "space-between", alignItems: "center", gap: 2 }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {total > 0 ? Math.round((value / total) * 100) : 0}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    aria-label={`${name} expense percentage`}
                    value={total > 0 ? (value / total) * 100 : 0}
                    sx={{
                      [`& .${linearProgressClasses.bar}`]: {
                        backgroundColor: COLORS[i % COLORS.length],
                      },
                    }}
                  />
                </Stack>
              </Stack>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
