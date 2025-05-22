import * as d3 from 'd3';
import { useRef, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import styles from '../Dashboard.module.css';
import axios from 'axios';
import { interpolateRdBu } from 'd3-scale-chromatic';

interface ImpactHeatmapProps {
  selectedGroup: 'voltagepower' | 'temperature';
}

const featureMap: Record<string, string[]> = {
  voltagepower: [
    'iA', 'iA_diff', 'P_H2_supply', 'P_H2_inlet',
    'P_Air_supply', 'P_Air_inlet', 'm_Air_write', 'm_H2_write', 'T_Stack_inlet',
  ],
  temperature: [
    'P_H2_inlet', 'P_Air_inlet', 'T_Heater', 'T_Stack_inlet',
  ],
};

export default function ImpactHeatmap({ selectedGroup }: ImpactHeatmapProps) {
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
    if (!chartRef.current || dimensions.width === 0 || dimensions.height === 0 || !id) return;

    d3.select(chartRef.current).selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 30, left: 100 };
    const svgWidth = dimensions.width;
    const features = featureMap[selectedGroup];
    const rowHeight = 40;
    const svgHeight = margin.top + margin.bottom + rowHeight * features.length;
    

    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    const svg = d3.select(chartRef.current)
      .append('svg')
      .attr('width', svgWidth)
      .attr('height', svgHeight);

    const chartArea = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    

    axios.get(`http://ec2-3-39-41-151.ap-northeast-2.compute.amazonaws.com:8080/api/pemfc/${id}/dynamask/${selectedGroup}/recent`)
    .then(response => {
      console.log(`다이나마스크 데이터 호출 성공: http://ec2-3-39-41-151.ap-northeast-2.compute.amazonaws.com:8080/api/pemfc/${id}/dynamask/${selectedGroup}/recent`);
      const json = response.data;

      if (!json?.value || !Array.isArray(json.value)) return;

      const rawData: number[][] = json.value;
      const numTimeSteps = rawData.length;
      const reversedRawData = [...rawData].reverse();

      // Transpose data
      const data = reversedRawData.flatMap((row, t) =>
        row.map((value, f) => ({
          time: t,
          feature: features[f],
          value,
        }))
      );

        const x = d3.scaleLinear()
          .domain([0, numTimeSteps])
          .range([0, width]);

        const y = d3.scaleBand()
          .domain(features)
          .range([0, height])
          .padding(0.05);

        const cellWidth = width / numTimeSteps;
        const cellHeight = y.bandwidth();

        const extent = d3.extent(data, d => d.value) as [number, number];

        const colorScale = d3.scaleSequential(t => interpolateRdBu(1 - t)).domain(extent);

        chartArea.selectAll("rect")
          .data(data)
          .enter()
          .append("rect")
          .attr("x", d => x(d.time))
          .attr("y", d => y(d.feature)!)
          .attr("width", cellWidth)
          .attr("height", cellHeight)
          .attr("fill", d => colorScale(d.value));

        // Y axis
        chartArea.append("g")
          .call(d3.axisLeft(y).tickSize(0))
          .selectAll("text")
          .style("font-size", "12px");

        // Optional: X ticks every 100 steps
        const xAxis = d3.axisBottom(x)
          .ticks(6)
          .tickFormat(d => `${Number(d)}`);

        chartArea.append("g")
          .attr("transform", `translate(0, ${height})`)
          .call(xAxis)
          .selectAll("text")
          .style("font-size", "10px");
      });
  }, [dimensions, id, selectedGroup]);

  return (
    <div className={styles.heatmapContainer}>
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
