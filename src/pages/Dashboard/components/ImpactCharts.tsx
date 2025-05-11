import * as d3 from 'd3';
import { useRef, useEffect, useState } from 'react';
import styles from '../Dashboard.module.css';

export default function LineCharts() {
  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);  // svg 엘리먼트를 저장할 ref
  const [data, setData] = useState<any[]>([]);

  // 데이터 가져오기 (한 번만)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/pemfc/1/record/all');
        const result = await response.json();

        const last30Data = result.slice(-100).map((d: any) => ({
          date: new Date(d.timestamp),
          value: d.t_3,
        }));

        setData(last30Data);
      } catch (error) {
        console.error('데이터를 가져오는 중 오류가 발생했습니다.', error);
      }
    };

    fetchData();
  }, []); // 빈 배열을 넣어서 컴포넌트가 마운트될 때만 실행

  // 그래프 렌더링 (한 번만 실행)
  useEffect(() => {
    if (data.length === 0 || svgRef.current) return;  // data가 없거나, 이미 렌더링된 경우는 return

    const margin = 20;  // 여백을 설정하여 그래프가 화면에 잘 들어가도록 함
    const cellSize = Math.max(20, window.innerWidth / 40);  // 셀 크기 동적으로 계산
    const numCols = Math.floor(window.innerWidth / cellSize);  // 한 행에 들어갈 셀 개수

    const numRows = Math.ceil(data.length / numCols);  // 데이터 길이에 맞춰 행 개수 계산
    const width = numCols * cellSize;  // 전체 너비는 셀 개수 * 셀 크기
    const height = numRows * cellSize;  // 전체 높이는 행 개수 * 셀 크기

    const formatDate = d3.utcFormat("%x");

    // 데이터에서 최대값과 최소값을 동적으로 계산
    const max = d3.max(data, d => d.value);
    const min = d3.min(data, d => d.value);
    
    // 동적으로 색상 범위 설정
    const color = d3.scaleSequential(d3.interpolateViridis).domain([min, max]);

    const svg = d3.create("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

    svg.selectAll("rect")
      .data(data)
      .join("rect")
      .attr("width", cellSize - 1)  // 셀의 너비
      .attr("height", cellSize - 1)  // 셀의 높이
      .attr("x", (d, i) => (i % numCols) * cellSize)  // x 위치 계산 (동적으로 셀 개수에 맞게 조정)
      .attr("y", (d, i) => Math.floor(i / numCols) * cellSize)  // y 위치 계산 (동적으로 셀 개수에 맞게 조정)
      .attr("fill", d => color(d.value))  // 동적으로 설정된 색상
      .attr("rx", 4)  // 둥근 모서리 적용
      .attr("ry", 4)
      .style("transition", "fill 0.3s ease")  // 색상 변경 시 부드러운 애니메이션 추가
      .append("title")
      .text(d => `${formatDate(d.date)}\nValue: ${d.value}`);

    // svg.node()가 null인지 확인한 후, null이 아니면 그래프를 추가하도록 처리
    const svgNode = svg.node();
    if (chartRef.current && svgNode) {
      svgRef.current = svgNode;  // svgRef에 svg.node() 할당
      chartRef.current.appendChild(svgRef.current);  // 그래프를 DOM에 추가
    }
  }, [data]); // data가 변경되면 그래프를 그리지만, 한 번만 실행됨

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <div className={styles.chartTitle}>모델 피처의 영향도 분석</div>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
