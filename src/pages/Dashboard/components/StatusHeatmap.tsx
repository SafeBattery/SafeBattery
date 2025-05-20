import * as d3 from 'd3';
import { useRef, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import styles from '../Dashboard.module.css';

interface StateHeatmapProps {
  selectedGroup: string;
}

export default function StateHeatmap({ selectedGroup }: StateHeatmapProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const { id } = useParams();

  useEffect(() => {
    if (!chartRef.current) return;
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });
    resizeObserver.observe(chartRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!chartRef.current || dimensions.width === 0 || dimensions.height === 0) return;

    d3.select(chartRef.current).selectAll('*').remove();

    const svgWidth = dimensions.width;
    const svgHeight = dimensions.height;
    const margin = { top: 10, right: 10, bottom: 10, left: 10 };

    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    const numCols = 6;
    const numRows = 5;
    const boxPadding = 5;
    const boxWidth = width / numCols - boxPadding;
    const boxHeight = height / numRows - boxPadding;

    const stateKeyMap: Record<string, string> = {
      pw: 'powerState',
      u_totV: 'voltageState',
      t_3: 'temperatureState',
    };

    const stateKey = stateKeyMap[selectedGroup];

    const colorMap: Record<string, string> = {
      NORMAL: '#4CAF50',
      WARNING: '#FFC107',
      DANGER: '#F44336',
    };

    const svg = d3.select(chartRef.current)
      .append('svg')
      .attr('width', svgWidth)
      .attr('height', svgHeight);

    const chartArea = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    fetch(`http://localhost:8080/api/pemfc/${id}/record/all`)
      .then(res => res.json())
      .then((rawData) => {
        if (!rawData || !Array.isArray(rawData)) return;

        const data = rawData.slice(-30).map((d, i) => {
          const stateKey = stateKeyMap[selectedGroup];
          return {
            row: Math.floor(i / numCols),
            col: i % numCols,
            state: d[stateKey], // 상태값 동적으로 접근
            value: d[selectedGroup], // 선택된 값
          };
        });

        const valueExtent = d3.extent(data, d => d.value) as [number, number];
        const valueColorScale = d3.scaleLinear<string>()
          .domain(valueExtent)
          .range(["#e0e0e0", "#000"]);

        chartArea.selectAll('rect')
          .data(data)
          .enter()
          .append('rect')
          .attr('x', d => d.col * (boxWidth + boxPadding))
          .attr('y', d => d.row * (boxHeight + boxPadding))
          .attr('width', boxWidth)
          .attr('height', boxHeight)
          .attr('rx', 6)
          .attr('ry', 6)
          .attr('fill', d => colorMap[d.state] || '#ccc');

        chartArea.selectAll('text')
          .data(data)
          .enter()
          .append('text')
          .attr('x', d => d.col * (boxWidth + boxPadding) + boxWidth / 2)
          .attr('y', d => d.row * (boxHeight + boxPadding) + boxHeight / 2 + 4)
          .attr('text-anchor', 'middle')
          .attr('fill', '#fff')
          .attr('font-size', '9px')
          .text(d => d.value.toFixed(4));
      });

  }, [dimensions, id, selectedGroup]);

  return (
    <div className={styles.heatmapContainer}>
      <div ref={chartRef} style={{ width: '100%', height: '100%'}} />
    </div>
  );
}
