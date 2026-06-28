import React, { useMemo, useState } from "react";

type Passenger = { title: string; firstName: string; lastName: string };

export default function BookingChecklistPanel({
  backendUrl,
  userId,
  userEmail,
  onDone,
}: {
  backendUrl: string;
  userId: string;
  userEmail?: string | null;
  onDone: (paymentLink: string) => void;
}) {
  const [tripType, setTripType] = useState<"oneway" | "roundtrip">("oneway");
  const [flightId, setFlightId] = useState("");
  const [returnFlightId, setReturnFlightId] = useState("");
  const [email, setEmail] = useState(userEmail || "");
  const [passengers, setPassengers] = useState<Passenger[]>([
    { title: "Mr", firstName: "", lastName: "" },
  ]);
  const [selectedSeats, setSelectedSeats] = useState("");
  const [selectedSeatsReturn, setSelectedSeatsReturn] = useState("");
  const [totalBaggages, setTotalBaggages] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const checklist = useMemo(() => {
    const out = [
      { label: "Trip type selected", ok: !!tripType },
      { label: "Outbound flight selected", ok: !!flightId },
      { label: "Contact email provided", ok: !!email },
      { label: "At least one passenger", ok: passengers.length > 0 && passengers.every(p => p.title && p.firstName && p.lastName) },
      { label: "Outbound seats selected", ok: selectedSeats.trim().length > 0 },
      { label: "Total baggage count set", ok: Number.isInteger(totalBaggages) && totalBaggages >= 0 },
    ];
    if (tripType === "roundtrip") {
      out.push({ label: "Return flight selected", ok: !!returnFlightId });
      out.push({ label: "Return seats selected", ok: selectedSeatsReturn.trim().length > 0 });
    }
    return out;
  }, [tripType, flightId, email, passengers, selectedSeats, totalBaggages, returnFlightId, selectedSeatsReturn]);

  const allOk = useMemo(() => checklist.every(c => c.ok), [checklist]);

  const submit = async () => {
    if (!allOk) return;
    setSubmitting(true);
    try {
      const payload = {
        data: {
          tripType,
          flightId,
          returnFlightId: tripType === "roundtrip" ? returnFlightId || null : null,
          passengerUser: { email },
          passengers,
          totalBaggages,
          selectedSeats: selectedSeats.split(',').map(s => s.trim()).filter(Boolean),
          selectedSeatsReturn: tripType === "roundtrip" ? selectedSeatsReturn.split(',').map(s => s.trim()).filter(Boolean) : null,
        },
      };
      const res = await fetch(`${backendUrl}/api/ai/booking/checkout-session/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data?.paymentLink) {
        onDone(String(data.paymentLink));
      } else {
        onDone(`Failed to create payment link: ${data?.message || res.statusText}`);
      }
    } catch (e: any) {
      onDone(`Error contacting booking server: ${e?.message || e}`);
    } finally {
      setSubmitting(false);
    }
  };

  const updatePassenger = (i: number, field: keyof Passenger, value: string) => {
    setPassengers(prev => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  };

  return (
    <div className="bg-white/90 rounded-xl p-3 border border-blue-200">
      <h4 className="font-semibold text-[#2152A3]">Booking Checklist</h4>
      <div className="grid grid-cols-1 gap-2 mt-2">
        <div className="flex items-center gap-2">
          <label className="w-28 text-sm">Trip Type</label>
          <select className="border rounded px-2 py-1 text-sm" value={tripType} onChange={(e) => setTripType(e.target.value as any)}>
            <option value="oneway">oneway</option>
            <option value="roundtrip">roundtrip</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="w-28 text-sm">Flight ID</label>
          <input className="border rounded px-2 py-1 text-sm grow" value={flightId} onChange={(e)=>setFlightId(e.target.value)} placeholder="Outbound flightId" />
        </div>
        {tripType === "roundtrip" && (
          <div className="flex items-center gap-2">
            <label className="w-28 text-sm">Return ID</label>
            <input className="border rounded px-2 py-1 text-sm grow" value={returnFlightId} onChange={(e)=>setReturnFlightId(e.target.value)} placeholder="Return flightId" />
          </div>
        )}
        <div className="flex items-center gap-2">
          <label className="w-28 text-sm">Email</label>
          <input className="border rounded px-2 py-1 text-sm grow" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="email@example.com" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Passengers</span>
            <button type="button" onClick={() => setPassengers(p=>[...p,{title:"Mr", firstName:"", lastName:""}])} className="text-xs text-blue-600">+ Add</button>
          </div>
          <div className="mt-2 space-y-2">
            {passengers.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <select className="border rounded px-2 py-1 text-sm" value={p.title} onChange={(e)=>updatePassenger(i,'title',e.target.value)}>
                  <option>Mr</option>
                  <option>Ms</option>
                  <option>Mrs</option>
                </select>
                <input className="border rounded px-2 py-1 text-sm grow" placeholder="First name" value={p.firstName} onChange={(e)=>updatePassenger(i,'firstName',e.target.value)} />
                <input className="border rounded px-2 py-1 text-sm grow" placeholder="Last name" value={p.lastName} onChange={(e)=>updatePassenger(i,'lastName',e.target.value)} />
                {passengers.length>1 && (
                  <button type="button" className="text-xs text-red-500" onClick={()=>setPassengers(prev=>prev.filter((_,idx)=>idx!==i))}>Remove</button>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="w-28 text-sm">Seats (out)</label>
          <input className="border rounded px-2 py-1 text-sm grow" value={selectedSeats} onChange={(e)=>setSelectedSeats(e.target.value)} placeholder="e.g. 12A,12B" />
        </div>
        {tripType === "roundtrip" && (
          <div className="flex items-center gap-2">
            <label className="w-28 text-sm">Seats (ret)</label>
            <input className="border rounded px-2 py-1 text-sm grow" value={selectedSeatsReturn} onChange={(e)=>setSelectedSeatsReturn(e.target.value)} placeholder="e.g. 14A,14B" />
          </div>
        )}
        <div className="flex items-center gap-2">
          <label className="w-28 text-sm">Baggages</label>
          <input type="number" className="border rounded px-2 py-1 text-sm w-24" value={totalBaggages} onChange={(e)=>setTotalBaggages(parseInt(e.target.value||'0',10))} min={0} />
        </div>
      </div>

      <div className="mt-3">
        <p className="text-sm font-medium mb-1">Progress</p>
        <ul className="space-y-1">
          {checklist.map((c, i) => (
            <li key={i} className="text-sm flex items-center gap-2">
              <span className={`inline-block w-4 h-4 rounded-full ${c.ok ? 'bg-green-500' : 'bg-gray-300'}`}></span>
              <span>{c.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button disabled={!allOk || submitting} onClick={submit} className={`px-3 py-1.5 rounded text-white ${allOk ? 'bg-[#2152A3] hover:bg-blue-700' : 'bg-gray-400'} ${submitting ? 'opacity-70' : ''}`}>
          {submitting ? 'Processing…' : 'Create Payment Link'}
        </button>
      </div>
    </div>
  );
}

