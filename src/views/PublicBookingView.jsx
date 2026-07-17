import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, User, Phone, CheckCircle2, Scissors,
  AlertCircle, MessageSquare, ChevronLeft, Coffee, HelpCircle, Users, CheckCircle
} from 'lucide-react';
import { db } from '../db';

const SERVICES = [
  { name: 'Corte', duration: 40, price: 'R$ 40,00' },
  { name: 'Barba', duration: 30, price: 'R$ 30,00' },
  { name: 'Corte + Barba', duration: 60, price: 'R$ 60,00' },
  { name: 'Sobrancelha', duration: 20, price: 'R$ 15,00' },
  { name: 'Platinado / Luzes', duration: 90, price: 'R$ 120,00' },
  { name: 'Selagem / Progressiva', duration: 120, price: 'R$ 150,00' }
];

// Helper to determine service duration dynamically
const getServiceDuration = (serviceName, customServices) => {
  const services = customServices || [];
  const found = services.find(s => s.name === serviceName);
  return found ? parseInt(found.duration, 10) : 40;
};

export default function PublicBookingView() {
  const { barberId } = useParams();
  const navigate = useNavigate();

  const [barberInfo, setBarberInfo] = useState(null);
  const [loadingBarber, setLoadingBarber] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Form states
  const [selectedService, setSelectedService] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [error, setError] = useState('');

  // Queue mode states
  const [shopBarbers, setShopBarbers] = useState([]);
  const [barbersQueues, setBarbersQueues] = useState({});
  const [selectedBarberId, setSelectedBarberId] = useState('');
  const [showQueueJoinModal, setShowQueueJoinModal] = useState(false);
  const [trackingAppointment, setTrackingAppointment] = useState(null);

  // Fetch barber details on mount
  useEffect(() => {
    async function fetchBarber() {
      try {
        setLoadingBarber(true);
        const data = await db.getBarberPublicInfo(barberId);
        if (!data) {
          setError('Barbeiro não encontrado ou link inválido.');
        } else {
          setBarberInfo(data);
          const services = data.servicos_config || SERVICES;
          if (services.length > 0) {
            setSelectedService(services[0].name);
          }
        }
      } catch (err) {
        console.error(err);
        setError('Erro ao carregar informações do barbeiro.');
      } finally {
        setLoadingBarber(false);
      }
    }
    if (barberId) {
      fetchBarber();
    }
  }, [barberId]);

  // Fetch booked appointments whenever the date changes
  useEffect(() => {
    async function fetchBookedTimes() {
      if (!barberId || !selectedDate) return;
      try {
        setLoadingSlots(true);
        const data = await db.getPublicAgendamentos(barberId, selectedDate);
        setAppointments(data);
        setSelectedTime(null); // Reset selected time when date changes
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSlots(false);
      }
    }
    fetchBookedTimes();
  }, [barberId, selectedDate]);

  // Generate date options (next 14 days)
  const dateOptions = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const offset = d.getTimezoneOffset() * 60000;
    const localDateStr = new Date(d.getTime() - offset).toISOString().split('T')[0];
    return {
      dateStr: localDateStr,
      dayNum: d.getDate(),
      weekday: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
      month: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
    };
  });

  // Generate candidate time slots dynamically based on barber's selected start and end hours
  const horaInicioInt = barberInfo?.hora_inicio ? parseInt(barberInfo.hora_inicio.split(':')[0], 10) : 8;
  const horaFimInt = barberInfo?.hora_fim ? parseInt(barberInfo.hora_fim.split(':')[0], 10) : 20;

  const timeSlots = [];
  for (let h = horaInicioInt; h <= horaFimInt; h++) {
    timeSlots.push(`${String(h).padStart(2, '0')}:00`);
    if (h < horaFimInt) {
      timeSlots.push(`${String(h).padStart(2, '0')}:30`);
    }
  }

  // Check if slot overlaps with any existing appointment
  const isTimeSlotBooked = (timeStr) => {
    const services = barberInfo?.servicos_config || SERVICES;
    const slotStart = new Date(`${selectedDate}T${timeStr}:00`);
    const slotDuration = getServiceDuration(selectedService, services);
    const slotEnd = new Date(slotStart.getTime() + slotDuration * 60 * 1000);

    // Disable if in the past
    if (slotStart < new Date()) {
      return true;
    }

    return appointments.some(app => {
      if (app.status === 'Cancelado') return false;
      const appStart = new Date(app.dataHora);
      const appDuration = getServiceDuration(app.servicos, services);
      const appEnd = new Date(appStart.getTime() + appDuration * 60 * 1000);

      // Intersection math: Start1 < End2 AND End1 > Start2
      return slotStart < appEnd && slotEnd > appStart;
    });
  };

  // Phone input formatting (Brazilian format: (XX) XXXXX-XXXX)
  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    if (value.length > 6) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    setClientPhone(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedService || !selectedDate || !selectedTime || !clientName.trim() || !clientPhone.trim()) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    const phoneDigits = clientPhone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      alert('Por favor, insira um número de telefone válido.');
      return;
    }

    const dataHoraStr = `${selectedDate}T${selectedTime}:00`;

    setSubmitting(true);
    setError('');

    try {
      const response = await db.addPublicAgendamento(barberId, {
        nome: clientName,
        telefone: phoneDigits,
        dataHora: dataHoraStr,
        servicos: selectedService
      });

      setSuccessData({
        ...response,
        time: selectedTime,
        dateFormatted: new Date(`${selectedDate}T00:00:00`).toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        })
      });
    } catch (err) {
      console.error(err);
      setError(`Erro ao enviar agendamento: ${err.message || 'Tente novamente.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Load shop barbers & queues dynamically (if in queue mode)
  useEffect(() => {
    if (barberInfo?.modelo_atendimento !== 'fila') return;

    async function loadQueues() {
      try {
        const barbers = await db.getBarbersInShop(barberInfo.barbearia_name);
        setShopBarbers(barbers);
        
        const queues = {};
        for (const b of barbers) {
          const q = await db.getQueueForBarber(b.id);
          queues[b.id] = q;
        }
        setBarbersQueues(queues);
      } catch (err) {
        console.error(err);
      }
    }
    loadQueues();
    const interval = setInterval(loadQueues, 20000); // refresh queues every 20 seconds
    return () => clearInterval(interval);
  }, [barberInfo]);

  // Poll customer's active appointment to track queue position
  useEffect(() => {
    if (!successData?.id) return;
    
    async function track() {
      try {
        const res = await db.getAgendamentoPublic(successData.id);
        if (res) {
          setTrackingAppointment(res);
        }
      } catch (e) {
        console.error(e);
      }
    }
    track();
    const interval = setInterval(track, 15000); // track position every 15 seconds
    return () => clearInterval(interval);
  }, [successData]);

  const handleJoinQueueSubmit = async (e) => {
    e.preventDefault();
    if (!clientName.trim() || !clientPhone.trim() || !selectedBarberId || !selectedService) {
      alert('Por favor, preencha todos os campos.');
      return;
    }
    
    const phoneDigits = clientPhone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      alert('Por favor, insira um número de telefone válido.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await db.addPublicAgendamento(selectedBarberId, {
        nome: clientName,
        telefone: phoneDigits,
        dataHora: new Date().toISOString(), // current timestamp
        servicos: selectedService
      });
      
      setSuccessData({
        ...res,
        time: new Date(res.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        dateFormatted: new Date(res.dataHora).toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        })
      });
      setTrackingAppointment(res);
      setShowQueueJoinModal(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao entrar na fila de espera.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderQueueView = () => {
    // If tracking is active, show the customer's position card!
    if (successData) {
      const targetBarberId = successData.barberId;
      const targetBarber = shopBarbers.find(b => b.id === targetBarberId) || barberInfo;
      const queueList = barbersQueues[targetBarberId] || [];
      const waitingList = queueList.filter(app => app.status === 'Pendente');
      
      const currentStatus = trackingAppointment?.status || successData.status;
      
      const myIndexInWaiting = waitingList.findIndex(app => app.id === successData.id);
      const positionInLine = myIndexInWaiting !== -1 ? myIndexInWaiting + 1 : null;
      
      let estimatedWait = 0;
      if (positionInLine !== null) {
        const frontPeople = waitingList.slice(0, myIndexInWaiting);
        estimatedWait = frontPeople.reduce((acc, app) => {
          const d = (targetBarber?.servicosConfig || []).find(s => s.name === app.servicos)?.duration || 40;
          return acc + d;
        }, 0);
        
        const activeApp = queueList.find(app => app.status === 'Confirmado');
        if (activeApp) {
          estimatedWait += (targetBarber?.servicosConfig || []).find(s => s.name === activeApp.servicos)?.duration || 40;
        }
      }

      return (
        <div className="min-h-screen bg-barber-dark text-barber-text-primary p-4 pb-12 font-sans flex items-center justify-center select-none">
          <div className="w-full max-w-md bg-barber-card border border-barber-border rounded-2xl p-6 text-center space-y-6 shadow-2xl fade-in">
            {currentStatus === 'Confirmado' ? (
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/35 rounded-full flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
                <Scissors className="w-8 h-8" />
              </div>
            ) : currentStatus === 'Concluído' ? (
              <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/35 rounded-full flex items-center justify-center mx-auto text-blue-400">
                <CheckCircle className="w-8 h-8" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/35 rounded-full flex items-center justify-center mx-auto text-amber-500 animate-pulse">
                <Clock className="w-8 h-8" />
              </div>
            )}

            <div className="space-y-2">
              <h2 className="text-lg font-bold text-zinc-100">
                {currentStatus === 'Confirmado' 
                  ? 'Sua Vez Chegou! 💈' 
                  : currentStatus === 'Concluído' 
                    ? 'Atendimento Concluído!' 
                    : 'Você está na Fila de Espera!'}
              </h2>
              <p className="text-xs text-zinc-400">
                {currentStatus === 'Confirmado'
                  ? `Dirija-se à cadeira do profissional ${targetBarber.nome}.`
                  : currentStatus === 'Concluído'
                    ? 'Obrigado pela preferência. Até a próxima!'
                    : 'Acompanhe sua posição abaixo em tempo real.'}
              </p>
            </div>

            {currentStatus === 'Pendente' && positionInLine !== null && (
              <div className="grid grid-cols-2 gap-4 bg-zinc-950/20 p-4 rounded-xl border border-barber-border/30 text-xs">
                <div className="text-center border-r border-barber-border/30">
                  <span className="text-[9px] text-zinc-550 uppercase font-black block select-none">Sua Posição</span>
                  <span className="font-extrabold text-2xl text-barber-accent-light mt-1 block">#{positionInLine}</span>
                </div>
                <div className="text-center">
                  <span className="text-[9px] text-zinc-550 uppercase font-black block select-none">Espera Estimada</span>
                  <span className="font-extrabold text-2xl text-zinc-200 mt-1 block">~{estimatedWait} min</span>
                </div>
              </div>
            )}

            <div className="bg-barber-dark/50 border border-barber-border rounded-xl p-4 text-left text-xs space-y-3 font-sans">
              <div className="flex justify-between border-b border-barber-border/40 pb-2">
                <span className="text-zinc-550">Profissional</span>
                <span className="font-bold text-zinc-200">{targetBarber.nome}</span>
              </div>
              <div className="flex justify-between border-b border-barber-border/40 pb-2">
                <span className="text-zinc-550">Serviço</span>
                <span className="font-bold text-zinc-200">{successData.servicos}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-550">Status</span>
                <span className={`font-bold capitalize ${currentStatus === 'Confirmado' ? 'text-emerald-400' : currentStatus === 'Concluído' ? 'text-blue-400' : 'text-amber-500'}`}>
                  {currentStatus === 'Confirmado' ? 'Na Cadeira' : currentStatus === 'Concluído' ? 'Concluído' : 'Aguardando na Fila'}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => {
                  const message = `Olá, ${targetBarber.nome}! Entrei na fila virtual pelo link:\n\n- *Cliente:* ${clientName}\n- *Serviço:* ${successData.servicos}\n- *Posição na fila:* #${positionInLine || 'Chamado'}\n\nEstou acompanhando aqui!`;
                  const barberPhone = targetBarber.telefone ? targetBarber.telefone.replace(/\D/g, '') : '';
                  const cleanPhone = barberPhone.startsWith('55') ? barberPhone : `55${barberPhone}`;
                  const url = barberPhone 
                    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
                    : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
                  window.open(url, '_blank');
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/20"
              >
                <MessageSquare className="w-4 h-4 fill-white text-emerald-600" />
                Enviar Aviso por WhatsApp
              </button>

              <button
                onClick={() => {
                  setSuccessData(null);
                  setClientName('');
                  setClientPhone('');
                  setSelectedService('');
                  setTrackingAppointment(null);
                }}
                className="w-full bg-zinc-850 hover:bg-zinc-800 active:scale-98 text-zinc-300 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer border border-zinc-700/50"
              >
                Sair da Tela de Fila
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-barber-dark text-barber-text-primary p-4 pb-12 font-sans flex items-center justify-center select-none">
        <div className="w-full max-w-md bg-barber-card border border-barber-border rounded-2xl shadow-xl overflow-hidden fade-in flex flex-col">
          
          <div className="p-5 border-b border-barber-border bg-barber-dark/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-barber-accent/10 border border-barber-accent/25 flex items-center justify-center text-barber-accent">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">{barberInfo.barbearia_name || 'Barbearia'}</h1>
              <p className="text-[10px] text-zinc-500 font-bold uppercase mt-0.5">Fila de espera em tempo real</p>
            </div>
          </div>

          <div className="p-5 space-y-6">
            
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest block">Profissionais Disponíveis</span>
              <div className="space-y-3">
                {shopBarbers.map((barber) => {
                  const queueList = barbersQueues[barber.id] || [];
                  const waitingCount = queueList.filter(app => app.status === 'Pendente').length;
                  
                  const waitTime = queueList.filter(app => app.status === 'Pendente').reduce((acc, app) => {
                    const d = (barber.servicosConfig || []).find(s => s.name === app.servicos)?.duration || 40;
                    return acc + d;
                  }, 0) + (queueList.find(app => app.status === 'Confirmado') ? 30 : 0);

                  const isAvailable = barber.statusFila === 'disponivel';
                  const isLunch = barber.statusFila === 'almoco';
                  const isPausa = barber.statusFila === 'pausa';
                  
                  let statusText = 'Livre - Sem fila!';
                  let statusColor = 'text-emerald-400';
                  let statusDot = 'bg-emerald-500';

                  if (isLunch) {
                    statusText = 'Em Horário de Almoço';
                    statusColor = 'text-amber-500';
                    statusDot = 'bg-amber-500';
                  } else if (isPausa) {
                    statusText = 'Em Pausa / Café';
                    statusColor = 'text-orange-500';
                    statusDot = 'bg-orange-500';
                  } else if (barber.statusFila === 'ausente') {
                    statusText = 'Ausente / Indisponível';
                    statusColor = 'text-red-500';
                    statusDot = 'bg-red-500';
                  } else if (waitingCount > 0) {
                    statusText = `${waitingCount} ${waitingCount === 1 ? 'pessoa' : 'pessoas'} na fila (~${waitTime} min)`;
                    statusColor = 'text-barber-accent-light';
                    statusDot = 'bg-barber-accent';
                  }

                  return (
                    <div
                      key={barber.id}
                      className="bg-zinc-950/20 border border-barber-border rounded-xl p-4 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-sm text-zinc-200 truncate">{barber.nome}</h4>
                        <div className="flex items-center gap-1.5 mt-1 font-sans text-[10px] font-bold">
                          <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`}></span>
                          <span className={statusColor}>{statusText}</span>
                        </div>
                      </div>

                      {isAvailable && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBarberId(barber.id);
                            const services = barber.servicosConfig || SERVICES;
                            if (services.length > 0) {
                              setSelectedService(services[0].name);
                            }
                            setShowQueueJoinModal(true);
                          }}
                          className="bg-barber-accent hover:bg-barber-accent-hover text-white text-[10px] font-bold uppercase py-2 px-3.5 rounded-lg active:scale-95 transition-all cursor-pointer shadow-sm shadow-barber-accent/15"
                        >
                          Entrar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {showQueueJoinModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-barber-card border border-barber-border rounded-2xl shadow-2xl p-6 space-y-5 fade-in max-h-[90vh] overflow-y-auto no-scrollbar">
              
              <div className="flex justify-between items-center select-none border-b border-barber-border/40 pb-3">
                <h3 className="text-sm font-extrabold text-zinc-100 uppercase tracking-wider">Entrar na Fila Virtual</h3>
                <button
                  type="button"
                  onClick={() => setShowQueueJoinModal(false)}
                  className="text-zinc-550 hover:text-zinc-350 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleJoinQueueSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Nome Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Digite seu nome"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-barber-dark border border-barber-border rounded-xl py-2.5 px-3 text-xs text-zinc-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Celular / WhatsApp</label>
                  <input
                    type="text"
                    required
                    placeholder="(93) 99199-0984"
                    value={clientPhone}
                    onChange={handlePhoneChange}
                    className="w-full bg-barber-dark border border-barber-border rounded-xl py-2.5 px-3 text-xs text-zinc-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Selecione o Serviço</label>
                  <div className="grid grid-cols-2 gap-2">
                    {((shopBarbers.find(b => b.id === selectedBarberId) || barberInfo)?.servicosConfig || SERVICES).map((service) => (
                      <div
                        key={service.name}
                        onClick={() => setSelectedService(service.name)}
                        className={`border rounded-xl p-3 cursor-pointer transition-all flex flex-col justify-between ${
                          selectedService === service.name
                            ? 'border-barber-accent bg-barber-accent/5'
                            : 'border-barber-border bg-zinc-900/10 hover:border-zinc-700/60'
                        }`}
                      >
                        <span className="text-[10.5px] font-bold text-zinc-200">{service.name}</span>
                        <div className="flex justify-between items-center mt-2 text-[9px] text-zinc-550">
                          <span>{service.duration} min</span>
                          <span className="font-bold text-barber-accent-light">{service.price}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-barber-accent hover:bg-barber-accent-hover text-white py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-barber-accent/15 mt-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Entrando na fila...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Confirmar Entrada na Fila
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loadingBarber) {
    return (
      <div className="min-h-screen bg-barber-dark flex flex-col items-center justify-center space-y-4 text-zinc-400 font-sans">
        <div className="w-8 h-8 border-3 border-barber-accent border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold">Carregando formulário de agendamento...</span>
      </div>
    );
  }

  if (error && !barberInfo) {
    return (
      <div className="min-h-screen bg-barber-dark flex flex-col items-center justify-center p-6 text-center font-sans space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h2 className="text-lg font-bold text-zinc-100">Ops! Algo deu errado</h2>
        <p className="text-xs text-zinc-400 max-w-xs">{error}</p>
      </div>
    );
  }

  if (barberInfo?.modelo_atendimento === 'fila') {
    return renderQueueView();
  }

  // Success Screen
  if (successData) {
    return (
      <div className="min-h-screen bg-barber-dark text-barber-text-primary flex flex-col items-center justify-center p-4 font-sans select-none">
        <div className="w-full max-w-md bg-barber-card border border-barber-border rounded-2xl p-6 text-center space-y-6 shadow-2xl fade-in">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/35 rounded-full flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-zinc-100">Agendamento Solicitado!</h2>
            <p className="text-xs text-zinc-400">
              Seu horário foi enviado para o barbeiro e está pendente de confirmação.
            </p>
          </div>

          {/* Details Box */}
          <div className="bg-barber-dark/50 border border-barber-border rounded-xl p-4 text-left text-xs space-y-3 font-sans">
            <div className="flex justify-between border-b border-barber-border/40 pb-2">
              <span className="text-zinc-550">Barbeiro</span>
              <span className="font-bold text-zinc-200">{barberInfo.nome}</span>
            </div>
            {barberInfo.barbearia_name && (
              <div className="flex justify-between border-b border-barber-border/40 pb-2">
                <span className="text-zinc-550">Barbearia</span>
                <span className="font-bold text-zinc-200">{barberInfo.barbearia_name}</span>
              </div>
            )}
            <div className="flex justify-between border-b border-barber-border/40 pb-2">
              <span className="text-zinc-550">Serviço</span>
              <span className="font-bold text-zinc-200">{selectedService}</span>
            </div>
            <div className="flex justify-between border-b border-barber-border/40 pb-2">
              <span className="text-zinc-550">Data</span>
              <span className="font-bold text-zinc-200 capitalize">{successData.dateFormatted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-550">Horário</span>
              <span className="font-bold text-barber-accent-light">{successData.time}</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => {
                const message = `Olá, ${barberInfo.nome}! Acabei de solicitar um agendamento pelo link:\n\n- *Cliente:* ${clientName}\n- *Serviço:* ${selectedService}\n- *Data/Hora:* ${successData.dateFormatted} às ${successData.time}\n\nPor favor, confirme no seu painel!`;
                const barberPhone = barberInfo.telefone ? barberInfo.telefone.replace(/\D/g, '') : '';
                const cleanPhone = barberPhone.startsWith('55') ? barberPhone : `55${barberPhone}`;
                const url = barberPhone
                  ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
                  : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
                window.open(url, '_blank');
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/20"
            >
              <MessageSquare className="w-4 h-4 fill-white text-emerald-600" />
              Enviar Aviso por WhatsApp
            </button>

            <button
              onClick={() => {
                setSuccessData(null);
                setClientName('');
                setClientPhone('');
                setSelectedTime(null);
              }}
              className="w-full bg-zinc-850 hover:bg-zinc-800 active:scale-98 text-zinc-300 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer border border-zinc-700/50"
            >
              Agendar Outro Horário
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-barber-dark text-barber-text-primary p-4 pb-12 font-sans flex items-center justify-center select-none">
      <div className="w-full max-w-md bg-barber-card border border-barber-border rounded-2xl shadow-xl overflow-hidden fade-in flex flex-col">
        
        {/* Header Banner */}
        <div className="p-5 border-b border-barber-border bg-barber-dark/40 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-barber-accent/10 border border-barber-accent/25 flex items-center justify-center text-barber-accent">
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Agendar Horário</h1>
            <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">
              Profissional: <span className="text-barber-accent-light">{barberInfo.nome}</span>
              {barberInfo.barbearia_name && ` • ${barberInfo.barbearia_name}`}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-6">

          {/* 1. Service Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
              1. Selecione o Serviço
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(barberInfo?.servicos_config || SERVICES).map((service) => (
                <div
                  key={service.name}
                  onClick={() => setSelectedService(service.name)}
                  className={`border rounded-xl p-3 cursor-pointer transition-all flex flex-col justify-between ${
                    selectedService === service.name
                      ? 'border-barber-accent bg-barber-accent/5'
                      : 'border-barber-border bg-zinc-900/10 hover:border-zinc-700/60'
                  }`}
                >
                  <span className="text-xs font-bold text-zinc-200">{service.name}</span>
                  <div className="flex justify-between items-center mt-2 text-[9px] text-zinc-500">
                    <span>{service.duration} min</span>
                    <span className="font-bold text-barber-accent-light">{service.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Date Carousel */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
              2. Escolha o Dia
            </label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {dateOptions.map((opt) => {
                const isSelected = selectedDate === opt.dateStr;
                return (
                  <div
                    key={opt.dateStr}
                    onClick={() => setSelectedDate(opt.dateStr)}
                    className={`flex-shrink-0 w-14 h-16 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all ${
                      isSelected
                        ? 'border-barber-accent bg-barber-accent text-white shadow-md shadow-barber-accent/15'
                        : 'border-barber-border bg-zinc-900/20 text-zinc-400 hover:border-zinc-700/50'
                    }`}
                  >
                    <span className="text-[8px] font-bold uppercase tracking-wider">
                      {opt.weekday}
                    </span>
                    <span className="text-sm font-black my-0.5">{opt.dayNum}</span>
                    <span className="text-[8px] uppercase">{opt.month}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Time Slots */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block flex items-center justify-between">
              <span>3. Escolha o Horário</span>
              {loadingSlots && (
                <span className="text-[8px] text-zinc-650 animate-pulse font-normal lowercase">Atualizando...</span>
              )}
            </label>
            
            {loadingSlots ? (
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-9 bg-zinc-900/20 border border-barber-border/40 rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1 no-scrollbar">
                {timeSlots.map((time) => {
                  const isBooked = isTimeSlotBooked(time);
                  const isSelected = selectedTime === time;

                  return (
                    <button
                      key={time}
                      type="button"
                      disabled={isBooked}
                      onClick={() => setSelectedTime(time)}
                      className={`h-9 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                        isBooked
                          ? 'border-zinc-900 bg-zinc-950/40 text-zinc-600 cursor-not-allowed line-through'
                          : isSelected
                          ? 'border-barber-accent bg-barber-accent/10 text-barber-accent'
                          : 'border-barber-border bg-zinc-900/10 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. Identification form */}
          <div className="space-y-4 border-t border-barber-border/50 pt-4">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-2">
              4. Seus Dados de Contato
            </label>
            
            <div className="space-y-3">
              <div className="relative">
                <User className="absolute left-3 top-3 text-zinc-500 w-4 h-4" />
                <input
                  type="text"
                  required
                  placeholder="Seu Nome Completo"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-zinc-950 border border-barber-border rounded-xl py-2.5 pl-9 pr-4 text-xs text-barber-text-primary placeholder:text-zinc-555"
                />
              </div>

              <div className="relative">
                <Phone className="absolute left-3 top-3 text-zinc-500 w-4 h-4" />
                <input
                  type="tel"
                  required
                  placeholder="Seu WhatsApp (Ex: (99) 99999-9999)"
                  value={clientPhone}
                  onChange={handlePhoneChange}
                  className="w-full bg-zinc-950 border border-barber-border rounded-xl py-2.5 pl-9 pr-4 text-xs text-barber-text-primary placeholder:text-zinc-555"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-500 text-[10px] rounded-lg font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-barber-accent hover:bg-barber-accent-hover disabled:bg-zinc-800 disabled:text-zinc-550 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 shadow-md shadow-barber-accent/15"
          >
            {submitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Confirmando...
              </>
            ) : (
              'Confirmar Meu Agendamento'
            )}
          </button>

        </form>
      </div>
    </div>
  );
}
