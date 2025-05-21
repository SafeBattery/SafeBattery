import * as d3 from "d3";
import React, { useRef, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import styles from "../Dashboard.module.css";

interface LineChartsProps {
  selectedGroup: string
}

const featureMap: Record<string, { apiPath: string; features: string[] }> = {
  pw: {
    apiPath: "voltagepower",
    features: [
      "ia",          // lowercase i
      "ia_diff",     // 마찬가지
      "p_H2_supply", // lowercase p
      "p_H2_inlet",
      "p_Air_supply",
      "p_Air_inlet",
      "m_Air_write",
      "m_H2_write",
      "t_Stack_inlet",
    ],
  },
  u_totV: {
    apiPath: "voltagepower",
    features: [
      "ia",          // lowercase i
      "ia_diff",     // 마찬가지
      "p_H2_supply", // lowercase p
      "p_H2_inlet",
      "p_Air_supply",
      "p_Air_inlet",
      "m_Air_write",
      "m_H2_write",
      "t_Stack_inlet",
    ],
  },
  t_3: {
    apiPath: "temperature",
    features: ["p_H2_inlet", "p_Air_inlet", "t_Heater", "t_Stack_inlet"],
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

function LineCharts({selectedGroup}: LineChartsProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { id } = useParams();

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [maskData, setMaskData] = useState<number[][]>([]);
  const [recordData, setRecordData] = useState<any[]>([]);

  const featureConfig = featureMap[selectedGroup];
  const stateField = stateFieldMap[selectedGroup];
  const containerRef = useRef<HTMLDivElement>(null);

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









  useEffect(() => {
    if (!containerRef.current || recordData.length === 0 || maskData.length === 0) {
      return;
    }
    const N = recordData.length;      // 600
    // 9
    
    // 차트 크기 설정
    const margin = { top: 10, right: 20, bottom: 20, left: 40 };
    const width = N - margin.left - margin.right;
    const height = 80 - margin.top - margin.bottom;
    
    // container 비우기
    const container = d3.select(containerRef.current);
    
    // (1) 마운트 시: 기존 contents 제거 후 그리기
    container.selectAll("*").remove();
    d3.select(containerRef.current).selectAll("*").remove();
    console.log("drawed", selectedGroup);

    // x, y 스케일
    const xScale = d3.scaleLinear()
      .domain([0, N - 1])
      .range([0, width]);
    console.log(recordData)

    featureMap[selectedGroup].features.forEach((key, i) => {
      const series = recordData.map(d => +d[key]);
      const [minV, maxV] = d3.extent(series) as [number, number];
      const pad = (maxV - minV) * 0.1;
      const y0 = Math.max(0, minV - pad);
      const y1 = Math.min(1, maxV + pad);
      const yScale = d3.scaleLinear().domain([y0, y1]).range([height, 0]);

      const svg = d3.select(containerRef.current)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // mask background
      const barW = xScale(1) - xScale(0);
      svg.selectAll("rect")
        .data(maskData)
        .enter()
        .append("rect")
        .attr("x", (_d, j) => xScale(j))
        .attr("width", barW)
        .attr("height", height)
        .attr("fill", d => d[i] >= 0.5 ? "red" : "green")
        .attr("opacity", 0.3);

      // line
      const line = d3.line<number>()
        .x((_, j) => xScale(j))
        .y(d => yScale(d));
      svg.append("path")
        .datum(series)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("d", line);

      // axes
      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).ticks(6));
      svg.append("g")
        .call(d3.axisLeft(yScale).ticks(3));

      // label
      svg.append("text")
        .attr("x", width - 5)
        .attr("y", 15)
        .attr("text-anchor", "end")
        .style("font-size", "12px")
        .text(key);
    });
  }, [recordData, maskData, selectedGroup]);
  return (
    <div ref={containerRef}
      className={styles.lineChartContainer} />
  );
}

export default React.memo(LineCharts);
