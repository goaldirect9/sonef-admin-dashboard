import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import authService from '@/services/auth.service';
import layoutTemplatesService, {
  SeatLayoutTemplate,
  LayoutJson,
  LayoutCell,
  CreateTemplateDto,
} from '@/services/layoutTemplates.service';

// ─── Cabin Canvas Preview ─────────────────────────────────────────────────────

const CELL = 36;
const AISLE = 20;
const ROW_STRIP = 28;
const COL_STRIP = 24;
const NOSE_H = 48;
const PAD = 12;

const STATUS_COLORS = {
  seat: { fill: '#E8F5E9', border: '#4CAF50' },
  premium: { fill: '#FFF8E1', border: '#FFB300' },
  vip: { fill: '#EDE7F6', border: '#7E57C2' },
  aisle: '#E0E0E0',
};

function drawCabin(canvas: HTMLCanvasElement, layout: LayoutJson) {
  const ctx = canvas.getContext('2d');
  if (!ctx || !layout) return;

  const aisleColCount = layout.cells.filter(
    (c) => c.row === 0 && c.type === 'aisle',
  ).length;
  const totalW =
    PAD * 2 + ROW_STRIP + layout.columns * CELL + aisleColCount * (AISLE - CELL);
  const totalH = PAD * 2 + NOSE_H + COL_STRIP + layout.rows * CELL;

  canvas.width = totalW;
  canvas.height = totalH;

  ctx.clearRect(0, 0, totalW, totalH);

  // Fuselage background
  ctx.fillStyle = '#FAFAFA';
  ctx.strokeStyle = '#90CAF9';
  ctx.lineWidth = 2;

  const bodyY = PAD + NOSE_H;
  const bodyH = COL_STRIP + layout.rows * CELL + PAD;

  // Nose (bezier curves converging to a point)
  ctx.beginPath();
  ctx.moveTo(PAD, bodyY);
  ctx.bezierCurveTo(PAD, PAD, totalW / 2, PAD, totalW / 2, PAD);
  ctx.bezierCurveTo(totalW / 2, PAD, totalW - PAD, PAD, totalW - PAD, bodyY);
  ctx.lineTo(totalW - PAD, bodyY + bodyH);
  ctx.lineTo(PAD, bodyY + bodyH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Driver label at front of vehicle
  ctx.fillStyle = '#1565C0';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🚌 DRIVER', totalW / 2, PAD + NOSE_H * 0.65);

  // Column headers
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = '#37474F';
  ctx.textAlign = 'center';

  let xCursor = PAD + ROW_STRIP;
  for (let c = 0; c < layout.columns; c++) {
    const firstCellInCol = layout.cells.find((cell) => cell.col === c && cell.row === 0);
    const isAisle = firstCellInCol?.type === 'aisle';
    const colW = isAisle ? AISLE : CELL;
    if (!isAisle) {
      const colLabel = String.fromCharCode(65 + layout.cells.filter(
        (cell) => cell.row === 0 && cell.type === 'seat' && cell.col < c,
      ).length);
      ctx.fillText(colLabel, xCursor + colW / 2, bodyY + COL_STRIP * 0.7);
    }
    xCursor += colW;
  }

  // Build column x positions
  const colX: number[] = [];
  let cx = PAD + ROW_STRIP;
  for (let c = 0; c < layout.columns; c++) {
    colX.push(cx);
    const isAisle = layout.cells.some((cell) => cell.col === c && cell.row === 0 && cell.type === 'aisle');
    cx += isAisle ? AISLE : CELL;
  }

  // Cells
  for (const cell of layout.cells) {
    const x = colX[cell.col];
    const y = bodyY + COL_STRIP + cell.row * CELL;
    const isAisle = layout.cells.some((cl) => cl.col === cell.col && cl.row === 0 && cl.type === 'aisle');
    const cellW = isAisle ? AISLE : CELL;

    if (cell.type === 'seat') {
      const zone = cell.seatType ?? 'seat';
      const colors =
        zone === 'vip'
          ? STATUS_COLORS.vip
          : zone === 'premium'
          ? STATUS_COLORS.premium
          : STATUS_COLORS.seat;

      // Seat body
      ctx.fillStyle = colors.fill;
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1.5;
      const pad = 3;
      ctx.beginPath();
      ctx.roundRect(x + pad, y + 8, CELL - pad * 2, CELL - 12, 4);
      ctx.fill();
      ctx.stroke();

      // Headrest arc
      ctx.beginPath();
      ctx.arc(x + CELL / 2, y + 8, 6, Math.PI, 0, false);
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.fillStyle = '#212121';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(cell.label ?? '', x + CELL / 2, y + CELL / 2 + 4);
    } else if (cell.type === 'aisle') {
      ctx.fillStyle = STATUS_COLORS.aisle;
      ctx.fillRect(x + 2, y + 2, cellW - 4, CELL - 4);
      // Dashed center line
      ctx.strokeStyle = '#BDBDBD';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x + cellW / 2, y);
      ctx.lineTo(x + cellW / 2, y + CELL);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // empty → draw nothing
  }

  // Row numbers (left strip)
  ctx.fillStyle = '#78909C';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  for (let r = 0; r < layout.rows; r++) {
    const y = bodyY + COL_STRIP + r * CELL + CELL / 2 + 4;
    ctx.fillText(String(r + 1), PAD + ROW_STRIP - 4, y);
  }
}

function CabinPreview({ layout }: { layout: LayoutJson | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && layout) {
      drawCabin(canvasRef.current, layout);
    }
  }, [layout]);

  if (!layout) {
    return (
      <div className="flex items-center justify-center h-40 bg-gray-100 rounded-lg text-gray-400 text-sm">
        Preview will appear here
      </div>
    );
  }

  return (
    <div className="overflow-auto border border-gray-200 rounded-lg bg-gray-50 p-2">
      <canvas ref={canvasRef} />
    </div>
  );
}

// ─── Seat Relabeling Utility ──────────────────────────────────────────────────

/** Re-assigns seat labels: row letter A/B/C… + seat index in that row (only prior *seat* cells count, so an empty cab column before a companion seat still yields A1). */
function relabelSeats(cells: LayoutCell[]): LayoutCell[] {
  return cells.map((cell) => {
    if (cell.type !== 'seat') return cell;
    const rowLetter = String.fromCharCode(65 + cell.row);
    const colsBefore = cells.filter(
      (c) => c.row === cell.row && c.col < cell.col && c.type === 'seat',
    ).length;
    return { ...cell, label: `${rowLetter}${colsBefore + 1}` };
  });
}

// ─── Drag-and-Drop Grid Editor ────────────────────────────────────────────────

function GridEditor({
  layout,
  onChange,
}: {
  layout: LayoutJson;
  onChange: (l: LayoutJson) => void;
}) {
  const [dragSrc, setDragSrc] = useState<{ row: number; col: number } | null>(null);
  const [dragOver, setDragOver] = useState<{ row: number; col: number } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const getCell = (r: number, c: number) =>
    layout.cells.find((cell) => cell.row === r && cell.col === c)!;

  const emit = (cells: LayoutCell[]) => onChange({ ...layout, cells });

  const setCellType = (r: number, c: number, next: 'empty' | 'seat' | 'aisle') => {
    const cell = getCell(r, c);
    if (cell.type === next) return;
    const updated = layout.cells.map((cl) =>
      cl.row === r && cl.col === c
        ? {
            ...cl,
            type: next,
            label: next === 'seat' ? '' : null,
            seatType: next === 'seat' ? (cl.seatType ?? 'standard') : null,
          }
        : cl,
    );
    const relabeled = relabelSeats(updated);
    emit(relabeled);
    if (selectedCell?.row === r && selectedCell?.col === c) {
      const nc = relabeled.find((cl) => cl.row === r && cl.col === c);
      if (nc?.type === 'seat') setEditLabel(nc.label ?? '');
      else setEditLabel('');
    }
  };

  const setZone = (r: number, c: number, zone: 'standard' | 'premium' | 'vip') => {
    emit(layout.cells.map((cl) => (cl.row === r && cl.col === c ? { ...cl, seatType: zone } : cl)));
  };

  const commitLabel = (r: number, c: number, label: string) => {
    emit(layout.cells.map((cl) => (cl.row === r && cl.col === c ? { ...cl, label } : cl)));
  };

  const handleDragStart = (r: number, c: number, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    setDragSrc({ row: r, col: c });
    setSelectedCell(null);
  };

  const handleDragOver = (r: number, c: number, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver({ row: r, col: c });
  };

  const handleDrop = (r: number, c: number) => {
    if (!dragSrc) return;
    const src = getCell(dragSrc.row, dragSrc.col);
    const dst = getCell(r, c);
    if (src && dst && !(dragSrc.row === r && dragSrc.col === c)) {
      emit(
        layout.cells.map((cl) => {
          if (cl.row === dragSrc.row && cl.col === dragSrc.col)
            return { ...cl, type: dst.type, label: dst.label, seatType: dst.seatType };
          if (cl.row === r && cl.col === c)
            return { ...cl, type: src.type, label: src.label, seatType: src.seatType };
          return cl;
        }),
      );
    }
    setDragSrc(null);
    setDragOver(null);
  };

  const addRow = () => {
    const r = layout.rows;
    const newCells = [
      ...layout.cells,
      ...Array.from({ length: layout.columns }, (_, c) => {
        const isAisleCol = layout.cells.filter((cl) => cl.col === c).every((cl) => cl.type === 'aisle');
        return { row: r, col: c, type: isAisleCol ? ('aisle' as const) : ('empty' as const), label: null, seatType: null };
      }),
    ];
    onChange({ rows: layout.rows + 1, columns: layout.columns, cells: newCells });
  };

  const removeRow = () => {
    if (layout.rows <= 1) return;
    const last = layout.rows - 1;
    onChange({ rows: last, columns: layout.columns, cells: layout.cells.filter((c) => c.row !== last) });
  };

  const addCol = () => {
    const col = layout.columns;
    const newCells = [
      ...layout.cells,
      ...Array.from({ length: layout.rows }, (_, r) => ({
        row: r, col, type: 'empty' as const, label: null, seatType: null,
      })),
    ];
    onChange({ rows: layout.rows, columns: layout.columns + 1, cells: newCells });
  };

  const removeCol = () => {
    if (layout.columns <= 1) return;
    const last = layout.columns - 1;
    onChange({ rows: layout.rows, columns: last, cells: layout.cells.filter((c) => c.col !== last) });
  };

  const columnIsAllAisle = (cells: LayoutCell[], col: number) =>
    cells.filter((cl) => cl.col === col).every((cl) => cl.type === 'aisle');

  const addRowFront = () => {
    const shifted = layout.cells.map((cl) => ({ ...cl, row: cl.row + 1 }));
    const newTop = Array.from({ length: layout.columns }, (_, c) => ({
      row: 0,
      col: c,
      type: columnIsAllAisle(layout.cells, c) ? ('aisle' as const) : ('empty' as const),
      label: null,
      seatType: null,
    }));
    onChange({ rows: layout.rows + 1, columns: layout.columns, cells: [...newTop, ...shifted] });
  };

  const removeRowFront = () => {
    if (layout.rows <= 1) return;
    const rest = layout.cells
      .filter((cl) => cl.row !== 0)
      .map((cl) => ({ ...cl, row: cl.row - 1 }));
    onChange({ rows: layout.rows - 1, columns: layout.columns, cells: rest });
  };

  /** First empty non-aisle cell on row 0 → seat; if none, insert a front row and try again. */
  const addSeatBesideDriver = () => {
    const tryPlaceOnRow0 = (cells: LayoutCell[], cols: number): LayoutCell[] | null => {
      for (let c = 0; c < cols; c++) {
        if (columnIsAllAisle(cells, c)) continue;
        const cl = cells.find((x) => x.row === 0 && x.col === c);
        if (cl?.type === 'empty') {
          return cells.map((x) =>
            x.row === 0 && x.col === c
              ? { ...x, type: 'seat' as const, label: '', seatType: 'standard' as const }
              : x,
          );
        }
      }
      return null;
    };

    let cells = layout.cells;
    let rows = layout.rows;
    let next = tryPlaceOnRow0(cells, layout.columns);
    if (!next) {
      const shifted = cells.map((cl) => ({ ...cl, row: cl.row + 1 }));
      const newTop = Array.from({ length: layout.columns }, (_, c) => ({
        row: 0,
        col: c,
        type: columnIsAllAisle(cells, c) ? ('aisle' as const) : ('empty' as const),
        label: null,
        seatType: null,
      }));
      cells = [...newTop, ...shifted];
      rows += 1;
      next = tryPlaceOnRow0(cells, layout.columns);
    }
    if (next) onChange({ rows, columns: layout.columns, cells: relabelSeats(next) });
  };

  // Column header labels (1, 2, null for aisle, 3, 4…)
  const colHeaders = Array.from({ length: layout.columns }, (_, c) => {
    const firstCell = layout.cells.find((cell) => cell.row === 0 && cell.col === c);
    if (firstCell?.type === 'aisle') return null;
    const seatColsBefore = Array.from({ length: c }, (_, i) => i).filter(
      (i) => !layout.cells.some((cell) => cell.row === 0 && cell.col === i && cell.type === 'aisle'),
    ).length;
    return seatColsBefore + 1;
  });

  const selectedCellData = selectedCell ? getCell(selectedCell.row, selectedCell.col) : null;

  // Build flat item list for CSS grid
  const gridItems: React.ReactNode[] = [];

  // Header row
  gridItems.push(<div key="corner" />);
  for (let c = 0; c < layout.columns; c++) {
    gridItems.push(
      <div key={`ch-${c}`} className="text-center text-[10px] text-gray-400 font-medium pb-0.5">
        {colHeaders[c] !== null ? colHeaders[c] : <span className="text-gray-200">—</span>}
      </div>,
    );
  }

  // Data rows
  for (let r = 0; r < layout.rows; r++) {
    // Row label
    gridItems.push(
      <div
        key={`rl-${r}`}
        className="flex flex-col items-end justify-center pr-1 text-[10px] text-gray-400 font-medium leading-tight"
        title={r === 0 ? 'Closest row to the driver — use an empty cell for the cab, then a seat for a companion' : undefined}
      >
        <span>{String.fromCharCode(65 + r)}</span>
        {r === 0 && <span className="text-[8px] text-blue-400 font-normal">drv</span>}
      </div>,
    );
    // Cells
    for (let c = 0; c < layout.columns; c++) {
      const cell = getCell(r, c);
      if (!cell) { gridItems.push(<div key={`${r}-${c}`} />); continue; }

      const isSrc = dragSrc?.row === r && dragSrc?.col === c;
      const isOver = !!(dragOver?.row === r && dragOver?.col === c && dragSrc);
      const isSelected = selectedCell?.row === r && selectedCell?.col === c;

      let colorCls = '';
      if (cell.type === 'seat') {
        if (cell.seatType === 'vip') colorCls = 'bg-purple-100 border-purple-500 text-purple-800';
        else if (cell.seatType === 'premium') colorCls = 'bg-yellow-100 border-yellow-500 text-yellow-800';
        else colorCls = 'bg-green-100 border-green-500 text-green-800';
      } else if (cell.type === 'aisle') {
        colorCls = 'bg-gray-200 border-gray-300 text-gray-400';
      } else {
        colorCls = 'bg-white border-gray-200 text-gray-300 hover:border-blue-400 hover:bg-blue-50';
      }

      const ringCls = isSelected
        ? cell.type === 'seat'
          ? cell.seatType === 'vip'
            ? 'ring-2 ring-purple-500 ring-offset-1'
            : cell.seatType === 'premium'
              ? 'ring-2 ring-yellow-500 ring-offset-1'
              : 'ring-2 ring-green-500 ring-offset-1'
          : 'ring-2 ring-blue-500 ring-offset-1'
        : isOver
          ? 'ring-2 ring-blue-500 ring-offset-1 scale-105'
          : '';

      gridItems.push(
        <div
          key={`${r}-${c}`}
          style={{ height: 36 }}
          className={`flex items-center justify-center rounded text-[10px] font-medium border-2 select-none transition-all duration-100
            ${colorCls}
            ${cell.type === 'seat' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
            ${cell.type === 'empty' ? 'border-dashed' : ''}
            ${isSrc ? 'opacity-25 scale-90' : ''}
            ${ringCls}
          `}
          draggable={cell.type === 'seat'}
          onClick={() => {
            setSelectedCell({ row: r, col: c });
            setEditLabel(cell.type === 'seat' ? (cell.label ?? '') : '');
          }}
          onDragStart={(e) => handleDragStart(r, c, e)}
          onDragOver={(e) => handleDragOver(r, c, e)}
          onDrop={() => handleDrop(r, c)}
        >
          {cell.type === 'seat' && cell.label}
          {cell.type === 'aisle' && '≡'}
          {cell.type === 'empty' && <span className="text-gray-300 text-[10px]">+</span>}
        </div>,
      );
    }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-xs font-medium text-gray-500">Rows:</span>
        <button
          type="button"
          onClick={addRowFront}
          className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200 rounded hover:bg-blue-100"
          title="Insert a new row next to the driver (becomes row A)"
        >
          + Front
        </button>
        <button
          type="button"
          onClick={removeRowFront}
          disabled={layout.rows <= 1}
          className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          − Front
        </button>
        <button type="button" onClick={addRow} className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50">+ Back</button>
        <button type="button" onClick={removeRow} disabled={layout.rows <= 1} className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">− Back</button>
        <span className="text-xs font-medium text-gray-500 ml-2">Cols:</span>
        <button type="button" onClick={addCol} className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50">+ Col</button>
        <button type="button" onClick={removeCol} disabled={layout.columns <= 1} className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">− Col</button>
        <span className="text-xs text-gray-400 ml-auto tabular-nums">{layout.rows} rows × {layout.columns} cols</span>
      </div>

      <div className="mb-2">
        <button
          type="button"
          onClick={addSeatBesideDriver}
          className="w-full sm:w-auto px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
        >
          + Seat beside driver
        </button>
        <p className="text-[10px] text-gray-400 mt-1">
          Fills the first empty cell on row A, or inserts a new front row if row A is full. Leave a cell as <strong>Empty</strong> for the driver cab, then add the companion seat.
        </p>
      </div>

      {/* Hint */}
      <p className="text-[11px] text-gray-400 mb-2">
        <strong>Click</strong> a cell to set type (seat, empty space, aisle) and zone below &nbsp;·&nbsp;
        <strong>Drag</strong> seats to swap positions
      </p>

      {/* Driver strip */}
      <div className="text-center text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded py-1.5 mb-2 px-2 leading-snug">
        <span className="block">🚌 DRIVER · front of vehicle</span>
        <span className="block text-[10px] font-normal text-blue-600 normal-case">
          Row A is directly behind the cab — use <strong>Empty</strong> for driver space and a <strong>Seat</strong> for a companion.
        </span>
      </div>

      {/* Grid */}
      <div className="overflow-auto max-h-72">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `20px repeat(${layout.columns}, minmax(34px, 40px))`,
            gap: 3,
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null);
          }}
          onDragEnd={() => { setDragSrc(null); setDragOver(null); }}
        >
          {gridItems}
        </div>
      </div>

      {/* Selected cell editor — type + zone + label */}
      {selectedCell && selectedCellData && (
        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-700">
              Row {String.fromCharCode(65 + selectedCell.row)}, column {selectedCell.col + 1}
              {selectedCellData.type === 'seat' && (
                <>
                  {' '}
                  · seat{' '}
                  <span className="font-mono bg-white border border-gray-200 px-1 rounded">
                    {selectedCellData.label ?? '—'}
                  </span>
                </>
              )}
            </span>
            <button
              type="button"
              onClick={() => setSelectedCell(null)}
              className="text-gray-400 hover:text-gray-600 text-xs"
            >
              ✕
            </button>
          </div>

          <fieldset className="border-0 p-0 m-0 min-w-0">
            <legend className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Cell type</legend>
            <div className="flex flex-col gap-1.5">
              {(
                [
                  { value: 'seat' as const, label: 'Seat' },
                  { value: 'empty' as const, label: 'Empty space' },
                  { value: 'aisle' as const, label: 'Aisle' },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none"
                >
                  <input
                    type="radio"
                    name="layout-cell-type"
                    checked={selectedCellData.type === opt.value}
                    onChange={() => setCellType(selectedCell.row, selectedCell.col, opt.value)}
                    className="h-3.5 w-3.5 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          {selectedCellData.type === 'seat' && (
            <>
              <fieldset className="border-0 p-0 m-0 min-w-0 mt-3">
                <legend className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Seat zone</legend>
                <div className="flex flex-col gap-1.5">
                  {(['standard', 'premium', 'vip'] as const).map((zone) => (
                    <label
                      key={zone}
                      className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer capitalize select-none"
                    >
                      <input
                        type="radio"
                        name="layout-seat-zone"
                        checked={(selectedCellData.seatType ?? 'standard') === zone}
                        onChange={() => setZone(selectedCell.row, selectedCell.col, zone)}
                        className="h-3.5 w-3.5 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span
                        className={
                          zone === 'standard'
                            ? 'text-green-800'
                            : zone === 'premium'
                              ? 'text-yellow-800'
                              : 'text-purple-800'
                        }
                      >
                        {zone}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="mt-3">
                <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">Seat label</label>
                <input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  onBlur={() => commitLabel(selectedCell.row, selectedCell.col, editLabel)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      commitLabel(selectedCell.row, selectedCell.col, editLabel);
                      (e.target as HTMLInputElement).blur();
                    }
                    if (e.key === 'Escape') setSelectedCell(null);
                  }}
                  className="w-28 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                  placeholder="e.g. A1"
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const DEFAULT_LAYOUT: LayoutJson = {
  rows: 4,
  columns: 5,
  cells: [
    // Row 0 — cab gap + companion + rest (row A = beside driver)
    { row: 0, col: 0, type: 'empty', label: null, seatType: null },
    { row: 0, col: 1, type: 'seat', label: 'A1', seatType: 'vip' },
    { row: 0, col: 2, type: 'aisle', label: null, seatType: null },
    { row: 0, col: 3, type: 'seat', label: 'A2', seatType: 'vip' },
    { row: 0, col: 4, type: 'seat', label: 'A3', seatType: 'vip' },
    // Row 1 — premium
    { row: 1, col: 0, type: 'seat', label: 'B1', seatType: 'premium' },
    { row: 1, col: 1, type: 'seat', label: 'B2', seatType: 'premium' },
    { row: 1, col: 2, type: 'aisle', label: null, seatType: null },
    { row: 1, col: 3, type: 'seat', label: 'B3', seatType: 'premium' },
    { row: 1, col: 4, type: 'seat', label: 'B4', seatType: 'premium' },
    // Row 2 — standard
    { row: 2, col: 0, type: 'seat', label: 'C1', seatType: 'standard' },
    { row: 2, col: 1, type: 'seat', label: 'C2', seatType: 'standard' },
    { row: 2, col: 2, type: 'aisle', label: null, seatType: null },
    { row: 2, col: 3, type: 'seat', label: 'C3', seatType: 'standard' },
    { row: 2, col: 4, type: 'seat', label: 'C4', seatType: 'standard' },
    // Row 3 — standard
    { row: 3, col: 0, type: 'seat', label: 'D1', seatType: 'standard' },
    { row: 3, col: 1, type: 'seat', label: 'D2', seatType: 'standard' },
    { row: 3, col: 2, type: 'aisle', label: null, seatType: null },
    { row: 3, col: 3, type: 'seat', label: 'D3', seatType: 'standard' },
    { row: 3, col: 4, type: 'seat', label: 'D4', seatType: 'standard' },
  ],
};

export default function LayoutTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<SeatLayoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formIsPublic, setFormIsPublic] = useState(true);
  const [formJsonText, setFormJsonText] = useState(
    JSON.stringify(DEFAULT_LAYOUT, null, 2),
  );
  const [jsonError, setJsonError] = useState('');
  const [nameError, setNameError] = useState('');
  const [previewLayout, setPreviewLayout] = useState<LayoutJson | null>(DEFAULT_LAYOUT);
  const [activeTab, setActiveTab] = useState<'visual' | 'json'>('visual');

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadTemplates();
  }, [router]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await layoutTemplatesService.getAll();
      setTemplates(data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleJsonChange = (text: string) => {
    setFormJsonText(text);
    try {
      const parsed = JSON.parse(text) as LayoutJson;
      setPreviewLayout(parsed);
      setJsonError('');
    } catch {
      setJsonError('Invalid JSON');
      setPreviewLayout(null);
    }
  };

  const handleGridChange = (newLayout: LayoutJson) => {
    setPreviewLayout(newLayout);
    setFormJsonText(JSON.stringify(newLayout, null, 2));
    setJsonError('');
  };

  const openCreate = () => {
    setEditingId(null);
    setFormName('');
    setFormIsPublic(true);
    setFormJsonText(JSON.stringify(DEFAULT_LAYOUT, null, 2));
    setPreviewLayout(DEFAULT_LAYOUT);
    setJsonError('');
    setNameError('');
    setActiveTab('visual');
    setShowForm(true);
  };

  const openEdit = (t: SeatLayoutTemplate) => {
    setEditingId(t.id);
    setFormName(t.name);
    setFormIsPublic(t.is_public);
    const json = JSON.stringify(t.layout_json, null, 2);
    setFormJsonText(json);
    setPreviewLayout(t.layout_json);
    setJsonError('');
    setNameError('');
    setActiveTab('visual');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setNameError('Template name is required');
      return;
    }
    setNameError('');
    if (jsonError || !previewLayout) {
      setJsonError('Fix JSON errors before saving');
      return;
    }

    setSaving(true);
    try {
      const dto: CreateTemplateDto = {
        name: formName.trim(),
        is_public: formIsPublic,
        layout_json: previewLayout,
      };
      if (editingId) {
        await layoutTemplatesService.update(editingId, dto);
      } else {
        await layoutTemplatesService.create(dto);
      }
      setShowForm(false);
      await loadTemplates();
    } catch (e: any) {
      setJsonError(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      await layoutTemplatesService.remove(id);
      await loadTemplates();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Delete failed');
    }
  };

  const seatCount = (layout: LayoutJson) =>
    layout.cells.filter((c) => c.type === 'seat').length;

  return (
    <>
      <Head>
        <title>Seat Layout Templates — Admin — Sonef</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Seat Layout Templates</h1>
              <p className="text-sm text-gray-500 mt-1">
                Design top-down vehicle seat maps for agencies to use on their buses and coaches
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                ← Dashboard
              </button>
              <button
                onClick={openCreate}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                + New Template
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Template Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl mx-4">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingId ? 'Edit Template' : 'New Seat Layout Template'}
                  </h2>
                </div>
                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left — form */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Template Name *
                      </label>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => {
                          setFormName(e.target.value);
                          setNameError('');
                        }}
                        placeholder="e.g. Standard Bus 45"
                        aria-invalid={nameError ? true : undefined}
                        className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                          nameError ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {nameError && (
                        <p className="mt-1 text-xs text-red-600" role="alert">
                          {nameError}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        id="is_public"
                        type="checkbox"
                        checked={formIsPublic}
                        onChange={(e) => setFormIsPublic(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                      />
                      <label htmlFor="is_public" className="text-sm text-gray-700">
                        Make public (agencies can select this template)
                      </label>
                    </div>

                    {/* Tab switcher */}
                    <div>
                      <div className="flex border-b border-gray-200 mb-3">
                        <button
                          onClick={() => setActiveTab('visual')}
                          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            activeTab === 'visual'
                              ? 'border-blue-600 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          Visual Editor
                        </button>
                        <button
                          onClick={() => setActiveTab('json')}
                          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            activeTab === 'json'
                              ? 'border-blue-600 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          JSON
                        </button>
                      </div>

                      {activeTab === 'visual' ? (
                        previewLayout ? (
                          <GridEditor layout={previewLayout} onChange={handleGridChange} />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-40 bg-red-50 border border-red-200 rounded-lg text-sm text-red-500 gap-2">
                            <span>JSON has errors — fix them in the JSON tab first.</span>
                            <button
                              onClick={() => setActiveTab('json')}
                              className="text-xs underline text-red-400 hover:text-red-600"
                            >
                              Switch to JSON tab
                            </button>
                          </div>
                        )
                      ) : (
                        <div>
                          <textarea
                            value={formJsonText}
                            onChange={(e) => handleJsonChange(e.target.value)}
                            rows={18}
                            spellCheck={false}
                            className="w-full font-mono text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                          />
                          {jsonError && (
                            <p className="mt-1 text-xs text-red-600">{jsonError}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right — cabin preview */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Live seat map preview{' '}
                      {previewLayout && (
                        <span className="text-gray-400 font-normal">
                          ({seatCount(previewLayout)} seats)
                        </span>
                      )}
                    </p>
                    <CabinPreview layout={previewLayout} />
                    <div className="mt-3 flex gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-3 h-3 rounded bg-green-100 border border-green-500" />
                        Standard
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-3 h-3 rounded bg-yellow-100 border border-yellow-500" />
                        Premium
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-3 h-3 rounded bg-purple-100 border border-purple-500" />
                        VIP
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-3 h-3 rounded bg-gray-200" />
                        Aisle
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !!jsonError || !previewLayout}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Template'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Templates list */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg font-medium">No templates yet</p>
              <p className="text-sm mt-1">Create a template to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {templates.map((t) => (
                <div key={t.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{t.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            t.is_public
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {t.is_public ? 'Public' : 'Private'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {seatCount(t.layout_json)} seats
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(t)}
                        className="text-xs px-3 py-1 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-xs px-3 py-1 border border-red-200 rounded-lg text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <CabinPreview layout={t.layout_json} />
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
