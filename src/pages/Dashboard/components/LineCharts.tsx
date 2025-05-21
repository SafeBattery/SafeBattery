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

const margin = { top: 20, right: 20, bottom: 30, left: 50 };

function LineCharts({ selectedGroup }: LineChartsProps) {
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
    const featureKeys = featureMap[selectedGroup].features;
    const N = recordData.length;   // 600
    const M = featureKeys.length;  // ex. 4
    // 1) 고정 전체 높이 300px
    const totalHeight = 300;
    const innerHeight = totalHeight - margin.top - margin.bottom;
    const width = N - margin.left - margin.right;
    // 2) bandH 를 innerHeight / M 으로 분배
    const bandH = innerHeight / M;
    const height = M * bandH;

    const xScale = d3.scaleLinear().domain([0, N - 1]).range([0, width]);
    const series = recordData.map(d => +d[selectedGroup]);
    const yExtent = d3.extent(series) as [number, number];
    const yScale = d3.scaleLinear()
      .domain(yExtent)      // [min, max]
      .nice()               // 보기 좋은 tick으로 조정
      .range([innerHeight, 0]);
  
    d3.select(containerRef.current).selectAll("*").remove();
    const svg = d3.select(containerRef.current)
    .selectAll("svg").data([0]).join("svg")
      .attr("width", width + margin.left + margin.right + 60)  // 오른쪽 레이블 공간 추가
      .attr("height", totalHeight)
    .selectAll("g").data([0]).join("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    // 히트맵 그리기 (기존과 동일)
    for (let j = 0; j < N; j++) {
      const x = xScale(j);
      const w = xScale(j + 1) - xScale(j);
      for (let i = 0; i < M; i++) {
        svg.append("rect")
          .attr("x", x)
          .attr("y", i * bandH)
          .attr("width", w)
          .attr("height", bandH)
          .attr("fill", maskData[j][i] >= 0.5
            ? "rgba(220,20,60,0.5)"
            : "rgba(20,200,100,0.5)");
      }
    }

    // X축
    svg.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(6));

    // Y 레이블
    // 왼쪽 숫자 Y축
    svg.append("g")
      .call(d3.axisLeft(yScale));
    // 오른쪽 피처 레이블
    const labelX = width + 10;  // margin left를 제외한 내부 width 끝에서 +10px
    const labels = svg.append("g")
      .attr("class", "feature-labels");
    featureKeys.forEach((key, i) => {
      labels.append("text")
        .attr("x", labelX)
        .attr("y", i * bandH + bandH / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "start")
        .style("font-size", "12px")
        .text(key);
    });
    
    // **단 한 번의 라인**: recordData[selectedGroup]
    const line = d3.line<number>()
      .x((_, j) => xScale(j))
      .y(d => yScale(d));

    svg.append("path")
      .datum(series)
      .attr("fill", "none")
      .attr("stroke", "navy")
      .attr("stroke-width", 2)
      .attr("d", line);
  }, [recordData, maskData, selectedGroup]);
  return (
    <div ref={containerRef}
      className={styles.lineChartContainer} />
  );
}

export default React.memo(LineCharts);
