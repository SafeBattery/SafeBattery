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
      "P_Air_supply", "P_Air_inlet", "m_Air_write", "m_H2_write", "T_Stack_inlet"
    ],
  },
  u_totV: {
    apiPath: "voltagepower",
    features: [
      "iA", "iA_diff", "P_H2_supply", "P_H2_inlet",
      "P_Air_supply", "P_Air_inlet", "m_Air_write", "m_H2_write", "T_Stack_inlet"
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

function LineCharts({ selectedGroup, selectedFeatures }: LineChartsProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { id } = useParams();

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [maskData, setMaskData] = useState<number[][]>([]);
  const [recordData, setRecordData] = useState<any[]>([]);

  const featureConfig = featureMap[selectedGroup];
  const stateField = stateFieldMap[selectedGroup];

  useEffect(() => {
    if (!chartRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions((prev) => {
          if (
            Math.abs(width - prev.width) > 1 ||
            Math.abs(height - prev.height) > 1
          ) {
            return { width, height };
          }
          return prev;
        });
      }
    });
    resizeObserver.observe(chartRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!id || !featureConfig) return;
    fetch(`http://localhost:8080/api/pemfc/${id}/dynamask/${featureConfig.apiPath}/recent`)
      .then(res => res.json())
      .then(json => {
        if (json?.value) setMaskData(json.value);
      });
  }, [id, selectedGroup]);

  useEffect(() => {
    if (!id) return;
    fetch(`http://localhost:8080/api/pemfc/${id}/record/recent600`)
      .then(res => res.json())
      .then(json => {
        if (Array.isArray(json)) {
          setRecordData(json.reverse());
        }
      });
  }, [id]);

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || dimensions.height === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 30, left: 100 };
    const svgWidth = dimensions.width;
    const svgHeight = dimensions.height;
    const chartWidth = svgWidth - margin.left - margin.right;
    const chartHeight = svgHeight - margin.top - margin.bottom;

    const chartArea = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const maxLen = Math.max(maskData.length, recordData.length);
    const x = d3.scaleLinear().domain([0, maxLen - 1]).range([0, chartWidth]);

    // X Axis
    chartArea.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x).tickSize(-chartHeight).tickPadding(8))
      .selectAll("line").attr("stroke", "#ddd");

    const color = d3.scaleOrdinal<string>()
      .domain(featureConfig.features)
      .range(d3.schemeCategory10);

    // Masked features (selectedFeatures)
    selectedFeatures.forEach(feature => {
      const idx = featureConfig.features.indexOf(feature);
      if (idx === -1 || !maskData.length) return;

      const values = maskData.map((d, i) => ({ index: i, value: d[idx] }));
      const extent = d3.extent(values, v => v.value) as [number, number];
      const y = d3.scaleLinear().domain(extent).range([chartHeight, 0]).nice();

      const line = d3.line<{ index: number; value: number }>()
        .x(d => x(d.index))
        .y(d => y(d.value));

      chartArea.append("path")
        .datum(values)
        .attr("fill", "none")
        .attr("stroke", color(feature))
        .attr("stroke-width", 1.5)
        .attr("stroke-opacity", 0.8)
        .attr("d", line);
    });

    // Record line for selectedGroup
    const recordValues = recordData
      .map((d, i) => ({ index: i, value: d[selectedGroup] }))
      .filter(d => d.value != null);

    if (recordValues.length > 0) {
      const extent = d3.extent(recordValues, d => d.value) as [number, number];
      const y = d3.scaleLinear().domain(extent).range([chartHeight, 0]).nice();

      const line = d3.line<{ index: number; value: number }>()
        .x(d => x(d.index))
        .y(d => y(d.value));

      chartArea.append("path")
        .datum(recordValues)
        .attr("fill", "none")
        .attr("stroke", d3.schemeSet2[["pw", "u_totV", "t_3"].indexOf(selectedGroup)])
        .attr("stroke-width", 3)
        .attr("d", line);
    }

    // ======================
    // 상태 수직선 추가 영역
    // ======================
    const stateLines = recordData.map((d, i) => ({
      index: i,
      state: d[stateField] as "NORMAL" | "WARNING" | "ERROR" | undefined
    }));

    const stateColor = (s: string | undefined) => {
      if (s === "NORMAL") return "#14ca74";
      if (s === "WARNING") return "#f0ad4e";
      if (s === "ERROR") return "#d9534f";
      return "#ccc";
    };

    chartArea.selectAll("line.state")
      .data(stateLines)
      .join("line")
      .attr("class", "state")
      .attr("x1", d => x(d.index))
      .attr("x2", d => x(d.index))
      .attr("y1", 0)
      .attr("y2", chartHeight)
      .attr("stroke", d => stateColor(d.state))
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.15);

  }, [maskData, recordData, dimensions, selectedFeatures, selectedGroup]);

  return (
    <div
      className={styles.lineChartContainer}
      style={{ position: "relative", width: "100%", height: "50%" }}
    >
      <svg
        ref={svgRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
      <div
        ref={chartRef}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
    </div>
  );
}

export default React.memo(LineCharts);
