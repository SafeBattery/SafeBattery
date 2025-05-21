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

  const [data, setData] = useState<any[] | null>(null);
  const [dim, setDim] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);

  const margin = { top: 20, right: 50, bottom: 30, left: 50 };

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDim(prev =>
        Math.abs(prev.width - width) > 1 || Math.abs(prev.height - height) > 1
          ? { width, height }
          : prev
      );
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!id) return;
    setData(null);
    fetch(`http://localhost:8080/api/pemfc/${id}/record/recent600`)
      .then(res => res.json())
      .then(arr => {
        if (Array.isArray(arr)) setData(arr.reverse());
      })
      .catch(console.error);
  }, [id, selectedGroup]);

  useEffect(() => {
    if (!svgRef.current || dim.width === 0 || dim.height === 0) return;

    const svg = d3.select(svgRef.current);

    const zoomed = (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
      setTransform(event.transform);
    };

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 10])
      .translateExtent([[0, 0], [dim.width, dim.height]])
      .extent([[0, 0], [dim.width, dim.height]])
      .on("zoom", zoomed);

    svg.call(zoomBehavior);
    svg.call(zoomBehavior.transform, d3.zoomIdentity);

    return () => {
      svg.on(".zoom", null);
    };
  }, [dim, data]);

  useEffect(() => {
    if (!data || dim.width === 0 || dim.height === 0) return;

    const svg = d3.select(svgRef.current!);
    svg.selectAll("*").remove();

    const width = dim.width - margin.left - margin.right;
    const height = dim.height - margin.top - margin.bottom;

    const chartArea = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .attr("clip-path", "url(#clip)");

    svg.append("defs").append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr("width", width)
      .attr("height", height);

    const axisArea = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const N = data.length;
    const xBase = d3.scaleLinear().domain([0, N - 1]).range([0, width]);
    const x = transform.rescaleX(xBase);
    const values = data.map(d => +d[selectedGroup]);
    const y = d3.scaleLinear().domain(d3.extent(values) as [number, number]).nice().range([height, 0]);

    axisArea.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickSize(-height).tickPadding(10))
      .selectAll("line").attr("stroke", "#ddd");

    axisArea.append("g")
      .call(d3.axisLeft(y).tickSize(-width).tickPadding(10))
      .selectAll("line").attr("stroke", "#ddd");

    const stateFieldMap: Record<string, string> = {
      pw: "powerState", u_totV: "voltageState", t_3: "temperatureState",
    };

    const filteredData = data.map((d, i) => ({ ...d, index: i }));
    const stateLines = filteredData.map(d => ({
      index: d.index,
      state: d[stateFieldMap[selectedGroup]] as string
    }));

    const stateColor = (s: string | undefined) =>
      s === "NORMAL" ? "#14ca74" : s === "WARNING" ? "#f0ad4e" : s === "ERROR" ? "#d9534f" : "#ccc";

    chartArea.selectAll("line.state")
      .data(stateLines)
      .join("line")
      .attr("x1", d => x(d.index))
      .attr("x2", d => x(d.index))
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", d => stateColor(d.state))
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.15);

    const lineGen = d3.line<number>()
      .x((_, i) => x(i))
      .y(d => y(d));

    chartArea.append("path")
      .datum(values)
      .attr("fill", "none")
      .attr("stroke", d3.schemeSet2[["pw", "u_totV", "t_3"].indexOf(selectedGroup)])
      .attr("stroke-width", 3)
      .attr("d", lineGen);

    const focusGroup = chartArea.append("g").style("display", "none");

    const verticalLine = focusGroup.append("line")
      .attr("y1", 0).attr("y2", height)
      .attr("stroke", "gray").attr("stroke-dasharray", "3 3").attr("stroke-width", 1);

    const horizontalLine = focusGroup.append("line")
      .attr("x1", 0).attr("x2", width)
      .attr("stroke", "gray").attr("stroke-dasharray", "3 3").attr("stroke-width", 1);

    const labelGroup = svg.append("g").style("display", "none");

    const xLabel = labelGroup.append("text")
      .attr("fill", "#333")
      .attr("font-size", "12px")
      .attr("text-anchor", "middle");

    const yLabel = labelGroup.append("text")
      .attr("fill", "#333")
      .attr("font-size", "12px")
      .attr("text-anchor", "end");

    svg.on("mousemove", (event) => {
      const [mx, my] = d3.pointer(event);
      const mouseX = mx - margin.left;

      const x0 = x.invert(mouseX);
      const i = d3.bisector((d: any) => d.index).left(filteredData, x0);
      const d = filteredData[i];
      if (!d) return;

      const cx = x(d.index);
      const cy = y(d[selectedGroup]);

      focusGroup.style("display", null);
      labelGroup.style("display", null);

      verticalLine.attr("x1", cx).attr("x2", cx);
      horizontalLine.attr("y1", cy).attr("y2", cy);

      xLabel
        .attr("x", cx + margin.left)
        .attr("y", height + margin.top + 18)
        .attr("font-size", 10)
        .attr("font-weight", 900)
        .text(`${d.index}`);
        

      yLabel
        .attr("x", margin.left - 8)
        .attr("y", cy + margin.top + 4)
        .attr("font-size", 10)
        .attr("font-weight", 900)
        .text(d[selectedGroup].toFixed(4))
    })
      .on("mouseover", () => {
        focusGroup.style("display", null);
        labelGroup.style("display", null);
      })
      .on("mouseout", () => {
        focusGroup.style("display", "none");
        labelGroup.style("display", "none");
      });
  }, [data, dim, selectedGroup, transform]);

  return (
    <div
      className={styles.lineChartContainer}
      style={{ position: "relative", width: "100%", height: 300 }}
      ref={containerRef}
    >
      <svg
        ref={svgRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}