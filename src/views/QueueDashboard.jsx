import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { db } from '../db';
import {
  Users, Play, Check, X, Clock, AlertCircle, Phone, Coffee,
  Scissors, UserPlus, RefreshCw, MessageSquare
} from 'lucide-react';

export default function QueueDashboard() {
  const { currentUser, setCurrentUser, refreshClientes } = useOutletContext();
  const navigate = useNavigate();

  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load active queue entries (status: Pendente or Confirmado for today)
  const fetchQueue = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError('');
    try {
      const data = await db.getQueueForBarber(currentUser.id);
      setQueue(data);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar fila de espera.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchQueue();
    // Auto-refresh queue list every 30 seconds
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  // Quick change status handler
  const handleStatusChange = async (newStatus) => {
    try {
      const updatedUser = await db.updateBarberConfig(currentUser.id, {
        telefone: currentUser.telefone,
        horaInicio: currentUser.horaInicio,
        horaFim: currentUser.horaFim,
        modeloAtendimento: currentUser.modeloAtendimento,
        statusFila: newStatus,
        servicosConfig: currentUser.servicosConfig
      });
      setCurrentUser(updatedUser);
    } catch (e) {
      console.error(e);
      alert('Erro ao atualizar status da fila.');
    }
  };

  // Call a client to the chair (changes status from Pendente to Confirmado)
  const handleCallToChair = async (appId) => {
    const activeApp = queue.find(app => app.status === 'Confirmado');
    if (activeApp) {
      alert(`Já existe um cliente na cadeira (${activeApp.cliente?.nome}). Por favor, conclua ou cancele o atendimento atual antes de chamar o próximo.`);
      return;
    }

    try {
      await db.updateAgendamentoStatus(currentUser.id, appId, 'Confirmado');
      await fetchQueue();
    } catch (e) {
      console.error(e);
      alert('Erro ao chamar cliente para a cadeira.');
    }
  };

  // Remove client from the queue (status: Cancelado)
  const handleRemoveFromQueue = async (appId) => {
    if (confirm('Deseja realmente remover este cliente da fila?')) {
      try {
        await db.updateAgendamentoStatus(currentUser.id, appId, 'Cancelado');
        await fetchQueue();
      } catch (e) {
        console.error(e);
        alert('Erro ao remover cliente da fila.');
      }
    }
  };

  // Split queue into active client (chair) and waiting clients
  const activeClient = queue.find(app => app.status === 'Confirmado');
  const waitingList = queue.filter(app => app.status === 'Pendente');

  // Estimate remaining queue wait time (sum of waiting services durations)
  const totalWaitTime = waitingList.reduce((acc, app) => {
    const duration = (currentUser?.servicosConfig || []).find(s => s.name === app.servicos)?.duration || 40;
    return acc + duration;
  }, 0);

  const getStatusDetails = (status) => {
    switch (status) {
      case 'almoco':
        return { label: 'Em Almoço', color: 'bg-amber-500/15 border-amber-500/30 text-amber-500', dot: 'bg-amber-500' };
      case 'pausa':
        return { label: 'Em Pausa / Café', color: 'bg-orange-500/15 border-orange-500/30 text-orange-500', dot: 'bg-orange-500' };
      case 'ausente':
        return { label: 'Ausente', color: 'bg-red-500/15 border-red-500/30 text-red-500', dot: 'bg-red-500' };
      default:
        return { label: 'Disponível', color: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400', dot: 'bg-emerald-500' };
    }
  };

  const statusInfo = getStatusDetails(currentUser?.statusFila);

  return (
    <div className="p-4 md:p-6 h-full flex flex-col font-sans fade-in max-w-2xl mx-auto">
      
      {/* Header Panel */}
      <div className="flex justify-between items-center border-b border-barber-border/50 pb-4 mb-4 select-none shrink-0">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-barber-accent" />
            Fila de Espera Virtual
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${statusInfo.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot} ${currentUser?.statusFila === 'disponivel' ? 'animate-pulse' : ''}`}></span>
              {statusInfo.label}
            </span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={fetchQueue}
            disabled={loading}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Atualizar Fila"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={() => navigate('/clientes/novo')}
            className="bg-barber-accent hover:bg-barber-accent-hover text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm shadow-barber-accent/15"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Cadastrar Cliente
          </button>
        </div>
      </div>

      {/* Quick Status Bar */}
      <div className="bg-barber-card border border-barber-border rounded-xl p-4 mb-5 select-none shrink-0">
        <span className="text-[9.5px] font-bold text-zinc-550 uppercase tracking-widest block mb-2.5">Alterar Meu Status de Trabalho</span>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => handleStatusChange('disponivel')}
            className={`py-2 px-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${currentUser?.statusFila === 'disponivel' ? 'bg-emerald-600/10 border-emerald-500/40 text-emerald-400' : 'bg-zinc-950/20 border-barber-border text-zinc-500 hover:text-zinc-350'}`}
          >
            🟢 Disponível
          </button>
          <button
            onClick={() => handleStatusChange('almoco')}
            className={`py-2 px-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${currentUser?.statusFila === 'almoco' ? 'bg-amber-600/10 border-amber-500/40 text-amber-400' : 'bg-zinc-950/20 border-barber-border text-zinc-500 hover:text-zinc-350'}`}
          >
            🟡 Almoço
          </button>
          <button
            onClick={() => handleStatusChange('pausa')}
            className={`py-2 px-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${currentUser?.statusFila === 'pausa' ? 'bg-orange-600/10 border-orange-500/40 text-orange-400' : 'bg-zinc-950/20 border-barber-border text-zinc-500 hover:text-zinc-350'}`}
          >
            ☕ Pausa
          </button>
          <button
            onClick={() => handleStatusChange('ausente')}
            className={`py-2 px-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${currentUser?.statusFila === 'ausente' ? 'bg-red-600/10 border-red-500/40 text-red-400' : 'bg-zinc-950/20 border-barber-border text-zinc-500 hover:text-zinc-350'}`}
          >
            🔴 Ausente
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 pb-6">
        
        {/* 1. Active Client Card (Chair) */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest block select-none">Em Atendimento (Na Cadeira)</span>
          {activeClient ? (
            <div className="bg-gradient-to-r from-emerald-950/10 to-zinc-900 border border-emerald-500/25 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col sm:flex-row justify-between sm:items-center gap-4 fade-in">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-8 -mt-8"></div>
              
              <div className="min-w-0 z-10">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full uppercase tracking-wider select-none animate-pulse">Cortando Agora</span>
                  <span className="text-zinc-500 text-[10px] select-none font-sans">• {activeClient.servicos}</span>
                </div>
                <h3 className="font-extrabold text-base text-zinc-200 truncate">{activeClient.cliente?.nome}</h3>
                
                {activeClient.cliente?.telefone && (
                  <div className="flex items-center gap-2 mt-2 select-none">
                    <span className="text-[11px] text-zinc-400 select-all font-sans font-medium">
                      {activeClient.cliente.telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
                    </span>
                    <a
                      href={`https://api.whatsapp.com/send?phone=55${activeClient.cliente.telefone.replace(/\D/g, '')}&text=${encodeURIComponent(
                        `Olá, ${activeClient.cliente?.nome}! Já vou iniciar seu atendimento.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors"
                      title="Chamar no WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

              <div className="flex gap-2 shrink-0 z-10 select-none">
                <button
                  onClick={() => handleRemoveFromQueue(activeClient.id)}
                  className="bg-zinc-950/40 hover:bg-red-950/20 border border-zinc-800 hover:border-red-900/40 text-zinc-550 hover:text-red-400 p-3 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                  title="Cancelar Corte"
                >
                  <X className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    navigate(`/clientes/${activeClient.clienteId}/atendimentos/novo`, {
                      state: { appointmentId: activeClient.id }
                    });
                  }}
                  className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/30"
                >
                  <Check className="w-4 h-4" />
                  Concluir Corte
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-barber-border rounded-2xl p-6 text-center text-zinc-600 select-none text-xs bg-zinc-950/10">
              Ninguém na cadeira no momento. Chame o primeiro da fila de espera!
            </div>
          )}
        </div>

        {/* 2. Waiting List (Queue) */}
        <div className="space-y-3">
          <div className="flex justify-between items-center select-none px-1">
            <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest block">Próximos da Fila (Lista de Espera)</span>
            <div className="flex gap-3 text-[10px] text-zinc-550 font-bold uppercase">
              <span>{waitingList.length} pessoas</span>
              {totalWaitTime > 0 && <span className="text-barber-accent-light">~{totalWaitTime} min total</span>}
            </div>
          </div>

          <div className="space-y-2">
            {waitingList.map((app, idx) => {
              const position = idx + 1;
              return (
                <div
                  key={app.id}
                  className="bg-barber-card border border-barber-border hover:border-zinc-800/80 rounded-xl p-4 transition-all flex justify-between items-center gap-4 fade-in"
                >
                  <div className="min-w-0 flex items-center gap-3.5">
                    {/* Position circle */}
                    <div className="w-8 h-8 rounded-full bg-zinc-950/60 border border-barber-border/80 flex items-center justify-center text-xs font-black text-barber-accent-light select-none">
                      #{position}
                    </div>
                    
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-sm text-zinc-200 truncate">{app.cliente?.nome}</h4>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[10px] text-zinc-500 font-sans select-none">
                        <span>{app.servicos}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3 text-zinc-650" />
                          Entrou às {new Date(app.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 select-none">
                    {app.cliente?.telefone && (
                      <a
                        href={`https://api.whatsapp.com/send?phone=55${app.cliente.telefone.replace(/\D/g, '')}&text=${encodeURIComponent(
                          `Olá, ${app.cliente?.nome}! Já é a sua vez. Pode vir para a barbearia.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-zinc-900 border border-zinc-800/80 hover:bg-zinc-800 text-zinc-450 hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="Enviar mensagem no WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </a>
                    )}
                    
                    <button
                      onClick={() => handleRemoveFromQueue(app.id)}
                      className="p-2 bg-zinc-900 border border-zinc-800/80 hover:bg-red-950/25 hover:border-red-900/30 text-zinc-450 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                      title="Remover da Fila"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleCallToChair(app.id)}
                      className="bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/25 text-emerald-400 hover:text-emerald-350 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-emerald-450 text-emerald-400" />
                      Chamar
                    </button>
                  </div>
                </div>
              );
            })}

            {waitingList.length === 0 && (
              <div className="border border-dashed border-barber-border/60 rounded-xl p-8 text-center text-zinc-650 text-xs select-none">
                Nenhum cliente aguardando na fila. Compartilhe seu link público!
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
