import React, { useState } from 'react';
import { Plus, Layout, X, Edit3, CheckCircle2, Trash2 } from 'lucide-react';

interface Progress {
  task: string;
  workerDone: boolean;
  managerDone: boolean;
}

interface Room {
  id: number;
  name: string;
  x: number;
  y: number;
  progress: Progress[];
}

const DEFAULT_TASKS = [
  { task: '軽鉄下地', workerDone: false, managerDone: false },
  { task: 'ボード貼り', workerDone: false, managerDone: false },
  { task: 'クロス仕上げ', workerDone: false, managerDone: false },
  { task: 'クリーニング', workerDone: false, managerDone: false },
];

function App() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

  // 部屋を追加
  const addRoom = () => {
    const newRoom: Room = {
      id: Date.now(),
      name: `${rooms.length + 101}号室`,
      x: 100,
      y: 100,
      progress: JSON.parse(JSON.stringify(DEFAULT_TASKS)),
    };
    setRooms([...rooms, newRoom]);
  };

  // ドラッグ操作
  const handleMouseDown = (e: React.MouseEvent, id: number) => {
    const room = rooms.find(r => r.id === id);
    if (!room) return;
    setDraggingId(id);
    setOffset({ x: e.clientX - room.x, y: e.clientY - room.y });
    e.stopPropagation();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingId === null) return;
    setRooms(rooms.map(room => 
      room.id === draggingId ? { ...room, x: e.clientX - offset.x, y: e.clientY - offset.y } : room
    ));
  };

  // 進捗・工程名の更新（ここが重要！）
  const updateProgress = (roomId: number, taskIndex: number, updates: Partial<Progress>) => {
    setRooms(rooms.map(room => {
      if (room.id === roomId) {
        const newProgress = [...room.progress];
        newProgress[taskIndex] = { ...newProgress[taskIndex], ...updates };
        return { ...room, progress: newProgress };
      }
      return room;
    }));
  };

  // 工程の削除
  const removeTask = (roomId: number, taskIndex: number) => {
    setRooms(rooms.map(room => {
      if (room.id === roomId) {
        return { ...room, progress: room.progress.filter((_, i) => i !== taskIndex) };
      }
      return room;
    }));
  };

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  return (
    <div className="flex h-screen w-full bg-gray-100 overflow-hidden" onMouseMove={handleMouseMove} onMouseUp={() => setDraggingId(null)}>
      {/* サイドバー */}
      <div className="w-80 bg-white border-r border-gray-200 p-6 shadow-lg z-10" style={{ width: '320px', backgroundColor: 'white' }}>
        <h1 className="text-xl font-bold mb-8 flex items-center gap-2">
          <Layout className="text-blue-600" /> 施工進捗管理
        </h1>
        <button onClick={addRoom} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-all" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', padding: '12px', cursor: 'pointer' }}>
          <Plus size={20} /> 部屋を追加
        </button>
        <div className="mt-10 text-xs text-gray-400">
          <p>部屋をクリックして詳細を編集</p>
          <p>ドラッグで位置を自由に変更</p>
        </div>
      </div>

      {/* メインキャンバス */}
      <div className="flex-1 relative bg-slate-200 p-4" style={{ flex: 1, backgroundColor: '#e2e8f0', position: 'relative' }}>
        {rooms.map((room) => (
          <div
            key={room.id}
            onMouseDown={(e) => handleMouseDown(e, room.id)}
            onClick={() => setSelectedRoomId(room.id)}
            style={{ 
              position: 'absolute', left: `${room.x}px`, top: `${room.y}px`, 
              width: '130px', height: '100px', backgroundColor: 'white', 
              border: selectedRoomId === room.id ? '3px solid #2563eb' : '2px solid #94a3b8',
              borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)', userSelect: 'none'
            }}
          >
            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{room.name}</span>
            <div style={{ fontSize: '11px', marginTop: '6px', color: '#475569', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '10px' }}>
              完了: {room.progress.filter(p => p.managerDone).length}/{room.progress.length}
            </div>
          </div>
        ))}
      </div>

      {/* 詳細編集パネル */}
      {selectedRoom && (
        <div style={{ position: 'fixed', top: 0, right: 0, width: '450px', height: '100%', backgroundColor: 'white', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)', zIndex: 50, padding: '30px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit3 size={20} className="text-gray-400" />
                <input 
                    value={selectedRoom.name} 
                    onChange={(e) => setRooms(rooms.map(r => r.id === selectedRoom.id ? {...r, name: e.target.value} : r))}
                    style={{ fontSize: '1.5rem', fontWeight: 'bold', border: 'none', borderBottom: '1px dashed #ccc', outline: 'none', width: '200px' }}
                />
            </div>
            <button onClick={() => setSelectedRoomId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={28}/></button>
          </div>

          <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', color: '#64748b', padding: '0 10px' }}>
            <span style={{ flex: 1 }}>工程名（クリックで編集）</span>
            <span style={{ width: '40px', textAlign: 'center' }}>業者</span>
            <span style={{ width: '40px', textAlign: 'center' }}>管理</span>
            <span style={{ width: '30px' }}></span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {selectedRoom.progress.map((p, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <input 
                  value={p.task} 
                  onChange={(e) => updateProgress(selectedRoom.id, index, { task: e.target.value })}
                  style={{ flex: 1, padding: '8px', border: '1px solid transparent', backgroundColor: 'transparent', outline: 'none' }}
                />
                <input type="checkbox" checked={p.workerDone} onChange={() => updateProgress(selectedRoom.id, index, { workerDone: !p.workerDone })} style={{ width: '22px', height: '22px', cursor: 'pointer' }} title="業者チェック" />
                <input type="checkbox" checked={p.managerDone} onChange={() => updateProgress(selectedRoom.id, index, { managerDone: !p.managerDone })} style={{ width: '22px', height: '22px', cursor: 'pointer' }} title="管理者チェック" />
                <button onClick={() => removeTask(selectedRoom.id, index)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}><Trash2 size={16} /></button>
              </div>
            ))}
            
            <button 
                onClick={() => setRooms(rooms.map(r => r.id === selectedRoom.id ? {...r, progress: [...r.progress, {task: '新工程', workerDone: false, managerDone: false}]} : r))}
                style={{ width: '100%', padding: '12px', marginTop: '10px', border: '2px dashed #e2e8f0', borderRadius: '8px', color: '#64748b', cursor: 'pointer', backgroundColor: 'white' }}
            >
                + 工程を追加
            </button>
          </div>
          
          <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
            <h4 style={{ margin: 0, fontSize: '14px', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <CheckCircle2 size={16} /> 進捗ステータス
            </h4>
            <p style={{ fontSize: '12px', color: '#3b82f6', marginTop: '5px' }}>
                全 {selectedRoom.progress.length} 工程中、{selectedRoom.progress.filter(p => p.managerDone).length} 工程が完了しています。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;