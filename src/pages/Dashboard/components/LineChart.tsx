// LineCharts.tsx
import * as d3 from 'd3';
import { useRef, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import styles from '../Dashboard.module.css';

interface LineChartProps {
  selectedGroup: string;
}

export default function LineChart({ selectedGroup }: LineChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const { id } = useParams();

  useEffect(() => {
    if (chartRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          const { width, height } = entry.contentRect;
          setDimensions({ width, height });
        }
      });
      resizeObserver.observe(chartRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  useEffect(() => {
  if (!chartRef.current || dimensions.width === 0 || dimensions.height === 0) return;

  d3.select(chartRef.current).selectAll('*').remove();

  const margin = { top: 20, right: 50, bottom: 20, left: 40 };

  // 💡 전체 svg 사이즈
  const svgWidth = (dimensions.width) ;
  const svgHeight = (dimensions.height) ;

  // 💡 내부 차트 그릴 영역 사이즈 (margin 제외)
  const chartWidth = svgWidth - margin.left - margin.right;
  const chartHeight = svgHeight - margin.top - margin.bottom;

  const svg = d3.select(chartRef.current)
    .append("svg")
    .attr("width", svgWidth)
    .attr("height", svgHeight)
    .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
    .attr("preserveAspectRatio", "none");

  const chartArea = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().range([0, chartWidth]);
  const y = d3.scaleLinear().range([chartHeight, 0]);
  const xAxisG = chartArea.append("g").attr("transform", `translate(0,${chartHeight})`);
  const yAxisG = chartArea.append("g");

  const path = chartArea.append("path")
    .attr("fill", "none")
    .attr("stroke-width", 3);

  const myColor = d3.scaleOrdinal<string>()
    .domain(["pw", "u_totV", "t_3"])
    .range(d3.schemeSet2);

  const focus = chartArea.append("g").style("display", "none");
  const focusCircle = focus.append("circle").attr("r", 6).attr("fill", "black");
  const focusText = focus.append("text")
    .attr("x", 9)
    .attr("dy", "-0.5em")
    .style("font-size", "12px");

  const bisect = d3.bisector((d: any) => d.index).left;

  fetch(`http://localhost:8080/api/pemfc/${id}/record/recent600`)
    .then(res => res.json())
    .then((rawData) => {
      if (!rawData || !Array.isArray(rawData)) return;

      const data = rawData
      const filteredData = data
        .slice()               // 원본 배열을 복사 (직접 수정 방지)
        .reverse()             // 배열 순서 반대로
        .map((d, i) => ({
          index: i,            // 새 순서에 따라 index 재부여
          value: +d[selectedGroup]
        }));

      const xExtent = d3.extent(filteredData, d => d.index) as [number, number];
      const yExtent = d3.extent(filteredData, d => d.value) as [number, number];

      x.domain(xExtent).nice();
      y.domain(yExtent).nice();

      xAxisG.call(d3.axisBottom(x).tickSize(-chartHeight).tickPadding(10).tickFormat(d => `${(Number(d)-600)}`))
        .selectAll("line").attr("stroke", "#ddd");
      yAxisG.call(d3.axisLeft(y).tickSize(-chartWidth).tickPadding(10))
        .selectAll("line").attr("stroke", "#ddd");

      const line = d3.line<any>()
        .x(d => x(d.index))
        .y(d => y(d.value));

      path.datum(filteredData)
        .attr("d", line)
        .attr("stroke", myColor(selectedGroup));

      let stateField = "";
        if (selectedGroup === "pw") stateField = "powerState";
        else if (selectedGroup === "u_totV") stateField = "voltageState";
        else if (selectedGroup === "t_3") stateField = "temperatureState";

      // 상태별 수직선 추가
      filteredData.forEach(d => {
        const original = data[data.length - 1 - d.index]; // filteredData는 reverse된 상태
        const state = original?.[stateField] || "UNKNOWN";

        let color = "#ccc";
        if (state === "NORMAL") color = "#14ca74";
        else if (state === "WARNING") color = "#f0ad4e";
        else if (state === "DANGER") color = "#d9534f";

        chartArea.append("line")
          .attr("x1", x(d.index))
          .attr("x2", x(d.index))
          .attr("y1", 0)
          .attr("y2", chartHeight)
          .attr("stroke", color)
          .attr("stroke-width", 1)
          .attr("stroke-opacity", 0.3);
      });


      svg.on("mousemove", function (event) {
        const mouseX = d3.pointer(event)[0] - margin.left;
        const x0 = x.invert(mouseX);
        const i = bisect(filteredData, x0);
        const selectedData = filteredData[i];

        if (selectedData) {
          focus.style("display", null);
          focus.attr("transform", `translate(${x(selectedData.index)},${y(selectedData.value)})`);
          focusText.text(`${selectedData.value.toFixed(4)}`);
        }
      })
        .on("mouseover", () => focus.style("display", null))
        .on("mouseout", () => focus.style("display", "none"));
    });
}, [dimensions, selectedGroup]);


  return (
    <div className={styles.lineChartContainer}>
      <div
        ref={chartRef}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
