"use client";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import { SparkLineChart } from "@mui/x-charts/SparkLineChart";
import { areaElementClasses, lineElementClasses } from "@mui/x-charts/LineChart";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";

function AreaGradient({ color, id }) {
  return (
    <defs>
      <linearGradient id={id} x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stopColor={color} stopOpacity={0.3} />
        <stop offset="100%" stopColor={color} stopOpacity={0} />
      </linearGradient>
    </defs>
  );
}

function getBadgeProps(percentChange) {
  if (percentChange === null || percentChange === undefined) {
    return { icon: undefined, chipColor: "default" };
  }
  if (percentChange > 0) return { icon: <TrendingUpIcon fontSize="small" />, chipColor: "success" };
  if (percentChange < 0) return { icon: <TrendingDownIcon fontSize="small" />, chipColor: "error" };
  return { icon: <TrendingFlatIcon fontSize="small" />, chipColor: "default" };
}

export function SummaryStatCard({ title, value, interval, trend, data, xAxisData, percentChange }) {
  const theme = useTheme();

  const trendColor = {
    up: theme.palette.income?.main || theme.palette.success.main,
    down: theme.palette.expense?.main || theme.palette.error.main,
    neutral: theme.palette.grey[400],
  }[trend] ?? theme.palette.grey[400];

  const gradientId = `area-gradient-${title.toLowerCase().replace(/\s+/g, "-")}`;

  const hasChange = percentChange !== null && percentChange !== undefined;
  const { icon, chipColor } = getBadgeProps(percentChange);
  const chipLabel = hasChange
    ? `${percentChange >= 0 ? "+" : ""}${percentChange.toFixed(1)}%`
    : "–";

  return (
    <Card variant="outlined" sx={{ height: "100%", flexGrow: 1 }}>
      <CardContent>
        <Typography component="h2" variant="subtitle2" gutterBottom>
          {title}
        </Typography>
        <Stack direction="column" sx={{ justifyContent: "space-between", flexGrow: 1, gap: 1 }}>
          <Stack sx={{ justifyContent: "space-between" }}>
            <Stack
              direction="row"
              sx={{ justifyContent: "space-between", alignItems: "center" }}
            >
              <Typography variant="h4" component="p">
                {value}
              </Typography>
              <Chip
                size="small"
                color={chipColor}
                icon={icon}
                label={chipLabel}
              />
            </Stack>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {interval}
            </Typography>
          </Stack>
          <Box sx={{ width: "100%", height: 50 }}>
            {data && data.length > 1 ? (
              <SparkLineChart
                colors={[trendColor]}
                data={data}
                xAxis={xAxisData?.length ? { scaleType: "band", data: xAxisData } : undefined}
                area
                showHighlight
                showTooltip
                sx={{
                  [`& .${areaElementClasses.root}`]: {
                    fill: `url(#${gradientId})`,
                  },
                  [`& .${lineElementClasses.root}`]: {
                    stroke: trendColor,
                  },
                }}
              >
                <AreaGradient color={trendColor} id={gradientId} />
              </SparkLineChart>
            ) : (
              <Box sx={{ height: 50 }} />
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
