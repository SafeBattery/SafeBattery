import * as d3 from 'd3';
import { useRef, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import styles from '../Dashboard.module.css';

export default function LineCharts() {
  const chartRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [selectedGroup, setSelectedGroup] = useState("pw");
  const { id } = useParams();

  const handleCsvDownload = () => {
    fetch(`http://localhost:8080/api/pemfc/${id}/csv`)
      .then(res => {
        if (!res.ok) throw new Error("Download failed");
        return res.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pemfc_${id}_data.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch(error => {
        console.error("CSV 다운로드 실패:", error);
      });
  };

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

    const margin = { top: 10, right: 40, bottom: 0, left: 40 },
      width = dimensions.width - margin.left - margin.right,
      height = dimensions.height - margin.top - margin.bottom - 50;

    const svg = d3.select(chartRef.current)
      .append("svg")
      .attr("width", dimensions.width)
      .attr("height", dimensions.height);

    const chartArea = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().range([0, width]);
    const y = d3.scaleLinear().range([height, 0]);
    const xAxisG = chartArea.append("g").attr("transform", `translate(0,${height})`);
    const yAxisG = chartArea.append("g");

    const path = chartArea.append("path")
      .attr("fill", "none")
      .attr("stroke-width", 3);

    const allGroup = ["pw", "u_totV", "t_3"];
    const myColor = d3.scaleOrdinal<string>().domain(allGroup).range(d3.schemeSet2);

    // 툴팁 관련 요소
    const focus = chartArea.append("g").style("display", "none");
    const focusCircle = focus.append("circle")
      .attr("r", 6)
      .attr("fill", "black");

    const focusText = focus.append("text")
      .attr("x", 9)
      .attr("dy", "-0.5em")
      .style("font-size", "12px")
      .style("background", "#fff");

    const bisect = d3.bisector((d: any) => d.index).left;

    fetch(`http://localhost:8080/api/pemfc/${id}/record/all`)
      .then(res => res.json())
      .then((rawData) => {
        if (!rawData || !Array.isArray(rawData)) return;

        const data = rawData.slice(-10);

        const update = (selected: string) => {
          const filteredData = data.map((d, i) => ({
            index: i,
            value: +d[selected]
          }));

          const xExtent = d3.extent(filteredData, d => d.index) as [number, number];
          x.domain(xExtent).nice();
          xAxisG.call(d3.axisBottom(x).tickSize(-height).tickPadding(10))
            .selectAll("line").attr("stroke", "#ddd");

          const yExtent = d3.extent(filteredData, d => d.value) as [number, number];
          y.domain(yExtent).nice();
          yAxisG.call(d3.axisLeft(y).tickSize(-width).tickPadding(10))
            .selectAll("line").attr("stroke", "#ddd");

          const line = d3.line<any>()
            .x(d => x(d.index))
            .y(d => y(d.value));

          path.datum(filteredData)
            .attr("d", line)
            .attr("stroke", myColor(selected));

          // 마우스 인터랙션
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
        };

        update(selectedGroup);
        (window as any).updateLineChart = update;
      });
  }, [dimensions]);

  useEffect(() => {
    if ((window as any).updateLineChart) {
      (window as any).updateLineChart(selectedGroup);
    }
  }, [selectedGroup]);

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <div className={styles.chartTitle}>최근 센서 데이터 트렌드</div>
        <select
          className={styles.selectDropdown}
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          aria-label="Select data group"
        >
          {["pw", "u_totV", "t_3"].map((group) => (
            <option key={group} value={group}>{group}</option>
          ))}
        </select>
        <button className={styles.excelDownloadButton} onClick={handleCsvDownload}>
            <span
              className="material-icons"
              style={{
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                lineHeight: 1,
                marginRight: '6px',
                position: 'relative',
                top: '1px',
              }}
            >
              download
            </span>
            전체 데이터셋 다운로드
          </button>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
