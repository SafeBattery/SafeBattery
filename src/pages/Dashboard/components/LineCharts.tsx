import * as d3 from "d3";
import React, { useRef, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import styles from "../Dashboard.module.css";
import axios from "axios";

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
      "iA_diff",     // 마찬가지
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

    axios
      .get(`http://ec2-3-39-41-151.ap-northeast-2.compute.amazonaws.com:8080/api/pemfc/${id}/dynamask/${featureConfig.apiPath}/recent`)
      .then((response) => {
        const json = response.data;
        if (json?.value) {
          setMaskData(json.value);
          console.log(`마스크 데이터 호출 성공: http://ec2-3-39-41-151.ap-northeast-2.compute.amazonaws.com:8080/api/pemfc/${id}/dynamask/${featureConfig.apiPath}/recent`);
        } else {
          console.warn("마스크 데이터 형식이 예상과 다름:", json);
        }
      })
      .catch((error) => {
        console.error("마스크 데이터 호출 실패:", error);
      });
  }, [id, featureConfig]);


  // Fetch recordData when id changes
  useEffect(() => {
  if (!id) return;

  axios.get(`http://ec2-3-39-41-151.ap-northeast-2.compute.amazonaws.com:8080/api/pemfc/${id}/record/recent600`)
    .then(response => {
      const json = response.data;
      if (Array.isArray(json)) {
        setRecordData(json.reverse());
        console.log(`최근 레코드 데이터 호출 성공: http://ec2-3-39-41-151.ap-northeast-2.compute.amazonaws.com:8080/api/pemfc/${id}/record/recent600`);
      } else {
        console.warn("최근 레코드 데이터 형식이 예상과 다름:", json);
      }
    })
    .catch(error => {
      console.error("최근 레코드 데이터 호출 실패:", error);
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

    const featureKeys = featureMap[selectedGroup].features;
    featureMap[selectedGroup].features.forEach((key, i) => {
      let series: number[] = [];

      if (key === "ia_diff") {
        series = recordData.map((d, idx) => {
          if (idx === 0) return 0;  
          const current = +recordData[idx][ "ia" ];  
          const prev = +recordData[idx - 1][ "ia" ];
          if (isNaN(current) || isNaN(prev)) return 0;
          return current - prev;
        });
        console.log("ia_diff series sample:", series.slice(0, 10));
        } else {
          series = recordData.map(d => +d[key]);
        }
      const [minV, maxV] = d3.extent(series) as [number, number];
      const pad = (maxV - minV) * 0.1;
      const y0 = Math.max(0, minV - pad);
      const y1 = Math.min(1, maxV + pad);
      const yScale = d3.scaleLinear().domain([y0, y1]).range([height, 0]);

      const svg = d3.select(containerRef.current)
        .append("svg")
        .attr("class", "chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // 바운더리 설정
      svg.append("defs")
        .append("clipPath")
        .attr("id", `clip-${i}`)       // i는 feature index
        .append("rect")
        .attr("width", width)
        .attr("height", height);
      const content = svg.append("g")
        .attr("class", "content")
        .attr("clip-path", `url(#clip-${i})`);

      // mask background
      const barW = xScale(1) - xScale(0);
      content.selectAll("rect")
        .data(maskData)
        .enter()
        .append("rect")
        .attr("class", "mask")
        .attr("x", (_d, j) => xScale(j))
        .attr("width", barW)
        .attr("height", height)
        .attr("fill", d => d[i] >= 0.5 ? "red" : "green")
        .attr("opacity", 0.3);

      // line
      const line = d3.line<number>()
        .x((_, j) => xScale(j))
        .y(d => yScale(d));
      content.append("path")
        .datum(series)
        .attr("class", `line feature-${i}`)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("d", line);

      // axes
      svg.append("g")
        .attr("class", "x-axis")
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



    // 2) 줌용 원본 x 스케일
    const x0 = d3.scaleLinear().domain([0, N - 1]).range([0, width]);

    // 3) 줌 핸들러
    function zoomed(event: d3.D3ZoomEvent<SVGSVGElement, unknown>) {
      const newX = event.transform.rescaleX(x0);

      // 모든 차트 SVG 순회
      d3.selectAll<SVGSVGElement, unknown>("svg.chart")
        .each(function (_, chartIndex) {
          // 이 SVG의 <g> 컨텐트 그룹
          const content = d3.select(this).select<SVGGElement>("g");

          // (A) x축
          content.select<SVGGElement>(".x-axis")
            .call(d3.axisBottom(newX).ticks(6).tickSize(-height).tickPadding(8))
            .selectAll("line").attr("stroke", "#ddd");

          // (B) mask rect
          content.selectAll<SVGRectElement, number>("rect.mask")
            .attr("x", (_d, j) => newX(j))
            .attr("width", (_d, j) => newX(j + 1) - newX(j));

          // (C) feature 라인 (maskData 기반)
          // chartIndex 가 곧 featureKeys 의 인덱스
          const fkey = featureKeys[chartIndex];
          const seriesF = maskData.map(row => row[chartIndex]);
          const [fMin, fMax] = d3.extent(seriesF) as [number, number];
          const fPad = (fMax - fMin) * 0.1;
          const y0F = Math.max(0, fMin - fPad);
          const y1F = Math.min(1, fMax + fPad);
          const yScaleF = d3.scaleLinear().domain([y0F, y1F]).range([height, 0]);
          const lineF = d3.line<number>()
            .x((_, j) => newX(j))
            .y(d => yScaleF(d));
          content.select<SVGPathElement>(".line.feature-" + chartIndex)
            .attr("d", lineF(seriesF));

          // (D) recordData 라인 (selectedGroup 기반)
          const seriesR = recordData.map(d => +d[selectedGroup]);
          // recordData 의 범위에 맞춘 yScale
          const [rMin, rMax] = d3.extent(seriesR) as [number, number];
          const rPad = (rMax - rMin) * 0.1;
          const y0R = Math.max(0, rMin - rPad);
          const y1R = Math.min(1, rMax + rPad);
          const yScaleR = d3.scaleLinear().domain([y0R, y1R]).range([height, 0]);
          const lineR = d3.line<number>()
            .x((_, j) => newX(j))
            .y(d => yScaleR(d));
          content.select<SVGPathElement>(".record-line")
            .attr("d", lineR(seriesR));

          // (E) state-lines
          content.selectAll<SVGLineElement, { index: number }>(".state-line")
            .attr("x1", d => newX(d.index))
            .attr("x2", d => newX(d.index));
          content.select<SVGGElement>(".x-axis")
            .attr("x", (_d, j) => newX(j))
            .attr("width", (_d, j) => newX(j + 1) - newX(j));
        });
    }

    // 4) zoomBehavior 부착
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 10])
      .translateExtent([[0, 0], [width, height]])
      .extent([[0, 0], [width, height]])
      .on("zoom", zoomed);

    d3.selectAll<SVGSVGElement, unknown>("svg.chart")
      .call(zoomBehavior)
      .call(zoomBehavior.transform, d3.zoomIdentity);
    const charts = d3.selectAll<SVGSVGElement, unknown>("svg.chart")
      .call(zoomBehavior);

    // 3) 새로고침(마운트) 시 한번만, 예컨대 2배 줌인
    const initialScale = 6;
    charts.call(
      zoomBehavior.transform,
      d3.zoomIdentity.translate(-width*(initialScale-1),0).scale(initialScale),
    );

    
  }, [recordData, maskData, selectedGroup]);
  return (
    <div ref={containerRef}
      className={styles.lineChartContainer} />
  );
}

export default React.memo(LineCharts);
