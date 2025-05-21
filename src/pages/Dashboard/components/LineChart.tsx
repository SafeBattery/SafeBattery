// LineChart.tsx
import * as d3 from "d3";
import React, { useRef, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import styles from "../Dashboard.module.css";

interface LineChartProps {
  selectedGroup: string;
}

export default function LineChart({ selectedGroup }: LineChartProps) {
  const { id } = useParams<{ id: string }>();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 원본 데이터
  const [data, setData] = useState<any[] | null>(null);
  // 컨테이너 크기
  const [dim, setDim] = useState({ width: 0, height: 0 });

  // ─── 한 번만: 컨테이너 크기 관찰 ─────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      // 변화폭이 작으면 무시
      setDim((prev) =>
        Math.abs(prev.width - width) > 1 || Math.abs(prev.height - height) > 1
          ? { width, height }
          : prev
      );
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ─── id 또는 selectedGroup 바뀔 때만 fetch ───────────────
  useEffect(() => {
    if (!id) return;
    setData(null); // 스켈레톤 표시
    fetch(`http://localhost:8080/api/pemfc/${id}/record/recent600`)
      .then((res) => res.json())
      .then((arr) => {
        if (Array.isArray(arr)) setData(arr.reverse());
      })
      .catch(console.error);
    console.log("fetched");
  }, [id, selectedGroup]);

  // ─── data, dim, selectedGroup 모두 준비되면 차트 draw ───────
  useEffect(() => {
    if (!data || dim.width === 0 || dim.height === 0) return;

    const margin = { top: 20, right: 50, bottom: 20, left: 40 };
    const W = dim.width - margin.left - margin.right;
    const H = dim.height - margin.top - margin.bottom;

    const svg = d3
      .select(svgRef.current!)
      .attr("viewBox", `0 0 ${dim.width} ${dim.height}`)
      .attr("preserveAspectRatio", "none");

    svg.selectAll("*").remove();

    const area = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // x, y 스케일
    const N = data.length;
    const x = d3
      .scaleLinear()
      .domain([0, N - 1])
      .range([0, W]);
    const values = data.map((d, i) => +d[selectedGroup]);
    const y = d3
      .scaleLinear()
      .domain(d3.extent(values) as [number, number])
      .nice()
      .range([H, 0]);

    // X축
    area
      .append("g")
      .attr("transform", `translate(0,${H})`)
      .call(d3.axisBottom(x).tickSize(-H).tickPadding(10))
      .selectAll("line")
      .attr("stroke", "#ddd");

    // Y축
    area
      .append("g")
      .call(d3.axisLeft(y).tickSize(-W).tickPadding(10))
      .selectAll("line")
      .attr("stroke", "#ddd");


    // 2) 사각형 그리기
    const stateFieldMap: Record<string, string> = {
      pw: "powerState",
      u_totV: "voltageState",
      t_3: "temperatureState",
    };
    const stateField = stateFieldMap[selectedGroup];

    // 2-1) 데이터와 state를 함께 묶어서 배열 생성
    const filteredData = data.map((d, i) => {
      return { ...d, index: i };
    });
    const stateLines = filteredData.map((d) => ({
      index: d.index,
      state: d[stateField] as
        | "NORMAL"
        | "WARNING"
        | "ERROR" 
        | undefined,
    }));

    // 2-2) 색상 함수
    const stateColor = (s: string | undefined) => {
      if (s === "NORMAL") return "#14ca74";
      if (s === "WARNING") return "#f0ad4e";
      if (s === "ERROR") return "#d9534f";
      return "#ccc";
    };
    const svgWidth = dim.width;
    const svgHeight = dim.height;

    // SVG 전체 크기에서 좌우 마진을 뺀 값이 바로 chartWidth
    const chartWidth = svgWidth - margin.left - margin.right;
    const chartHeight = svgHeight - margin.top - margin.bottom;
    // 2-3) 수직선 그리기
    area
      .selectAll("line.state")
      .data(stateLines)
      .join("line")
      .attr("class", "state")
      .attr("x1", (d) => x(d.index))
      .attr("x2", (d) => x(d.index))
      .attr("y1", 0)
      .attr("y2", chartHeight)
      .attr("stroke", (d) => stateColor(d.state))
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.15);

    // 라인
    const lineGen = d3
      .line<number>()
      .x((_, i) => x(i))
      .y((d) => y(d));

    area
      .append("path")
      .datum(values)
      .attr("fill", "none")
      .attr(
        "stroke",
        d3.schemeSet2[["pw", "u_totV", "t_3"].indexOf(selectedGroup)]
      )
      .attr("stroke-width", 3)
      .attr("d", lineGen);
    console.log("rendered", data);

    // 3) 마우스 호버
    const focus = area.append("g").style("display", "none");
    const focusCircle = focus.append("circle").attr("r", 6).attr("fill", "black");
    const focusText = focus.append("text")
      .attr("x", 9)
      .attr("dy", "-0.5em")
      .style("font-size", "12px");
    svg
      .on("mousemove", (event) => {
        const bisect = d3.bisector((d: any) => d.index).left;
        const mouseX = d3.pointer(event)[0] - margin.left;
        const x0 = x.invert(mouseX);
        const i = bisect(filteredData, x0);
        const selectedData = filteredData[i];

        if (selectedData) {
          focus.style("display", null);
          focus.attr(
            "transform",
            `translate(${x(selectedData.index)},${y(selectedData[selectedGroup])})`
          );
          focusText.text(`${selectedData[selectedGroup].toFixed(4)}`);
        }
      })
      .on("mouseover", () => focus.style("display", null))
      .on("mouseout", () => focus.style("display", "none"));
  }, [data, dim, selectedGroup]);

  return (
    <div
      className={styles.lineChartContainer}
      style={{
        position: "relative",
        width: "100%",
        height: 300
      }}
      ref={containerRef}
    >
      {/* SVG는 항상 렌더링 */}
      <svg
        ref={svgRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}
