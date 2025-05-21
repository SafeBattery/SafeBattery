import * as d3 from "d3";
import React, { useRef, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import styles from "../Dashboard.module.css";

interface LineChartsProps {
  selectedGroup: "pw" | "u_totV" | "t_3";
  selectedFeatures: string[];
}

const featureMap: Record<string, { apiPath: string; features: string[] }> = {
  pw: {
    apiPath: "voltagepower",
    features: [
      "iA", "iA_diff", "P_H2_supply", "P_H2_inlet",
      "P_Air_supply", "P_Air_inlet", "m_Air_write", "m_H2_write", "T_Stack_inlet",
    ],
  },
  u_totV: {
    apiPath: "voltagepower",
    features: [
      "iA", "iA_diff", "P_H2_supply", "P_H2_inlet",
      "P_Air_supply", "P_Air_inlet", "m_Air_write", "m_H2_write", "T_Stack_inlet",
    ],
  },
  t_3: {
    apiPath: "temperature",
    features: ["P_H2_inlet", "P_Air_inlet", "T_Heater", "T_Stack_inlet"],
  },
};

const stateFieldMap: Record<string, string> = {
  pw: "powerState",
  u_totV: "voltageState",
  t_3: "temperatureState",
};

const stateColor = (state?: string) => {
  switch (state) {
    case "NORMAL": return "#14ca74";
    case "WARNING": return "#f0ad4e";
    case "ERROR": return "#d9534f";
    default: return "#ccc";
  }
};

const margin = { top: 20, right: 20, bottom: 30, left: 100 };

function LineCharts({ selectedGroup, selectedFeatures }: LineChartsProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { id } = useParams();

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [maskData, setMaskData] = useState<number[][]>([]);
  const [recordData, setRecordData] = useState<any[]>([]);

  const featureConfig = featureMap[selectedGroup];
  const stateField = stateFieldMap[selectedGroup];

  // Resize observer to track container size
  useEffect(() => {
    if (!chartRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions(prev => {
          if (Math.abs(width - prev.width) > 1 || Math.abs(height - prev.height) > 1) {
            return { width, height };
          }
          return prev;
        });
      }
    });
    resizeObserver.observe(chartRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Fetch maskData when id or selectedGroup changes
  useEffect(() => {
    if (!id || !featureConfig) return;
    fetch(`http://localhost:8080/api/pemfc/${id}/dynamask/${featureConfig.apiPath}/recent`)
      .then(res => res.json())
      .then(json => {
        if (json?.value) setMaskData(json.value);
      });
  }, [id, featureConfig]);

  // Fetch recordData when id changes
  useEffect(() => {
    if (!id) return;
    fetch(`http://localhost:8080/api/pemfc/${id}/record/recent600`)
      .then(res => res.json())
      .then(json => {
        if (Array.isArray(json)) setRecordData(json.reverse());
      });
  }, [id]);

  // Create Y scale helper
  const createYScale = (values: number[], height: number) => {
    const extent = d3.extent(values);
    return d3.scaleLinear()
      .domain([extent[0] ?? 0, extent[1] ?? 1])
      .range([height, 0])
      .nice();
  };

  // Create line generator helper
  const createLine = <T extends { index: number; value: number }>(
    xScale: d3.ScaleLinear<number, number>,
    yScale: d3.ScaleLinear<number, number>
  ) =>
    d3.line<T>()
      .x(d => xScale(d.index))
      .y(d => yScale(d.value));

  // Draw all selectedFeatures lines
  function drawFeatureLines(
    chartArea: d3.Selection<SVGGElement, unknown, null, undefined>,
    x: d3.ScaleLinear<number, number>,
    chartHeight: number,
    color: d3.ScaleOrdinal<string, string, never>
  ) {
    selectedFeatures.forEach((feature, i) => {
      const idx = featureConfig.features.indexOf(feature);
      if (idx === -1 || maskData.length === 0) return;

      const values = maskData
        .map((d, i) => (d[idx] !== undefined ? { index: i, value: d[idx] } : null))
        .filter((v): v is { index: number; value: number } => v !== null);

      if (!values.length) return;

      const y = createYScale(values.map(v => v.value), chartHeight);
      const line = createLine(x, y);

      chartArea.append("path")
        .datum(values)
        .attr("class", `feature-line feature-${i}`)
        .attr("fill", "none")
        .attr("stroke", color(feature))
        .attr("stroke-width", 1.5)
        .attr("stroke-opacity", 0.8)
        .attr("d", line);
    });
  }

  // Draw recordData line
  function drawRecordLine(
    chartArea: d3.Selection<SVGGElement, unknown, null, undefined>,
    x: d3.ScaleLinear<number, number>,
    chartHeight: number
  ) {
    const recordValues = recordData
      .map((d, i) => ({ index: i, value: d[selectedGroup] }))
      .filter(d => d.value != null);

    if (!recordValues.length) return;

    const y = createYScale(recordValues.map(d => d.value), chartHeight);
    const line = createLine(x, y);

    chartArea.append("path")
      .datum(recordValues)
      .attr("class", "record-line")
      .attr("fill", "none")
      .attr("stroke", d3.schemeSet2[["pw", "u_totV", "t_3"].indexOf(selectedGroup)])
      .attr("stroke-width", 3)
      .attr("d", line);
  }

  // Draw vertical state lines
  function drawStateLines(
    chartArea: d3.Selection<SVGGElement, unknown, null, undefined>,
    x: d3.ScaleLinear<number, number>,
    chartHeight: number
  ) {
    const stateLines = recordData.map((d, i) => ({
      index: i,
      state: d[stateField] as "NORMAL" | "WARNING" | "ERROR" | undefined,
    }));

    chartArea.selectAll("line.state-line")
      .data(stateLines)
      .join("line")
      .attr("class", "state-line")
      .attr("x1", d => x(d.index))
      .attr("x2", d => x(d.index))
      .attr("y1", 0)
      .attr("y2", chartHeight)
      .attr("stroke", d => stateColor(d.state))
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.15);
  }

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || dimensions.height === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const svgWidth = dimensions.width;
    const svgHeight = dimensions.height;
    const chartWidth = svgWidth - margin.left - margin.right;
    const chartHeight = svgHeight - margin.top - margin.bottom;

    // Define clipPath
    svg.append("defs").append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr("width", chartWidth)
      .attr("height", chartHeight);

    const chartArea = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .attr("clip-path", `url(#clip)`);

    const maxLen = Math.max(maskData.length, recordData.length);
    const x = d3.scaleLinear().domain([0, maxLen - 1]).range([0, chartWidth]);

    // X Axis
    svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(${margin.left},${margin.top + chartHeight})`)
      .call(d3.axisBottom(x).tickSize(-chartHeight).tickPadding(8))
      .selectAll("line").attr("stroke", "#ddd");

    // Color scale for features
    const color = d3.scaleOrdinal<string>()
      .domain(featureConfig.features)
      .range(d3.schemeCategory10);

    drawFeatureLines(chartArea, x, chartHeight, color);
    drawRecordLine(chartArea, x, chartHeight);
    drawStateLines(chartArea, x, chartHeight);

    // Zoom handler
    function zoomed(event: d3.D3ZoomEvent<SVGSVGElement, unknown>) {
      const newX = event.transform.rescaleX(x);

      // Update X axis
      svg.select<SVGGElement>(".x-axis")
        .call(d3.axisBottom(newX).tickSize(-chartHeight).tickPadding(8))
        .selectAll("line").attr("stroke", "#ddd");

      // Update selectedFeatures lines
      selectedFeatures.forEach((feature, i) => {
        const idx = featureConfig.features.indexOf(feature);
        if (idx === -1 || maskData.length === 0) return;

        const values = maskData
          .map((d, i) => (d[idx] !== undefined ? { index: i, value: d[idx] } : null))
          .filter((v): v is { index: number; value: number } => v !== null);

        if (!values.length) return;

        const y = createYScale(values.map(v => v.value), chartHeight);
        const line = createLine(newX, y);

        chartArea.select<SVGPathElement>(`.feature-line.feature-${i}`)
          .datum(values)
          .attr("d", line);
      });

      // Update recordData line
      const recordValues = recordData
        .map((d, i) => ({ index: i, value: d[selectedGroup] }))
        .filter(d => d.value != null);

      if (recordValues.length > 0) {
        const y = createYScale(recordValues.map(d => d.value), chartHeight);
        const line = createLine(newX, y);

        chartArea.selectAll<SVGPathElement, any>(".record-line")
          .attr("d", line(recordValues));
      }

      // Update vertical state lines
      chartArea.selectAll<SVGLineElement, any>(".state-line")
        .attr("x1", d => newX(d.index))
        .attr("x2", d => newX(d.index));
    }

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 10])
      .translateExtent([[0, 0], [svgWidth, svgHeight]])
      .extent([[0, 0], [svgWidth, svgHeight]])
      .on("zoom", zoomed);

    svg.call(zoom);

    svg.call(zoom.transform, d3.zoomIdentity);
  }, [maskData, recordData, dimensions, selectedFeatures, selectedGroup]);

  return (
    <div
      className={styles.lineChartContainer}
      style={{ position: "relative", width: "100%", height: "50%" }}
      ref={chartRef}
    >
      <svg
        ref={svgRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}

export default React.memo(LineCharts);
