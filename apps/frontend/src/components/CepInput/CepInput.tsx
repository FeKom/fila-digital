"use client";
import { useState } from "react";
import { CommerceAddress } from "@/types";

type Props = {
  defaultAddress?: CommerceAddress | null;
};

type Status = "idle" | "loading" | "done" | "error";

const formatCep = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return digits;
};

const CepInput = ({ defaultAddress }: Props) => {
  const [cep, setCep] = useState(defaultAddress?.cep ?? "");
  const [street, setStreet] = useState(defaultAddress?.street ?? "");
  const [number, setNumber] = useState(defaultAddress?.number ?? "");
  const [complement, setComplement] = useState(
    defaultAddress?.complement ?? ""
  );
  const [neighborhood, setNeighborhood] = useState(
    defaultAddress?.neighborhood ?? ""
  );
  const [city, setCity] = useState(defaultAddress?.city ?? "");
  const [state, setState] = useState(defaultAddress?.state ?? "");
  const [lat, setLat] = useState<number | null>(
    defaultAddress?.latitude != null ? Number(defaultAddress.latitude) : null
  );
  const [lng, setLng] = useState<number | null>(
    defaultAddress?.longitude != null ? Number(defaultAddress.longitude) : null
  );
  const [status, setStatus] = useState<Status>(
    defaultAddress?.street ? "done" : "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const lookup = async (rawCep: string) => {
    const digits = rawCep.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setStatus("loading");
    setErrorMsg(null);

    try {
      // Step 1: CEP → address via ViaCEP (free, no key needed)
      const cepRes = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const cepData = (await cepRes.json()) as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };

      if (cepData.erro) {
        setErrorMsg("CEP não encontrado");
        setStatus("error");
        return;
      }

      setStreet(cepData.logradouro ?? "");
      setNeighborhood(cepData.bairro ?? "");
      setCity(cepData.localidade ?? "");
      setState(cepData.uf ?? "");

      // Step 2: address → coordinates via Nominatim/OpenStreetMap (free, no key needed)
      const searchQuery = [
        cepData.logradouro,
        cepData.localidade,
        cepData.uf,
        "Brasil",
      ]
        .filter(Boolean)
        .join(", ");

      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`,
        { headers: { "User-Agent": "FilaDigital/1.0" } }
      );
      const geoData = (await geoRes.json()) as { lat: string; lon: string }[];

      if (geoData.length > 0) {
        setLat(parseFloat(geoData[0].lat));
        setLng(parseFloat(geoData[0].lon));
      }

      setStatus("done");
    } catch {
      setErrorMsg("Erro ao buscar o CEP. Tente novamente.");
      setStatus("error");
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setCep(formatted);
    if (formatted.replace(/\D/g, "").length === 8) {
      lookup(formatted);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Hidden inputs carry data to the server action */}
      <input type="hidden" name="latitude" value={lat ?? ""} />
      <input type="hidden" name="longitude" value={lng ?? ""} />

      <div className="fd-field">
        <label className="fd-label" htmlFor="cep-input">
          CEP
        </label>
        <input
          id="cep-input"
          name="cep"
          type="text"
          placeholder="00000-000"
          className="fd-input"
          value={cep}
          onChange={handleCepChange}
          maxLength={9}
          inputMode="numeric"
        />
        {status === "loading" && (
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              marginTop: "0.25rem",
            }}
          >
            Buscando endereço...
          </p>
        )}
        {status === "error" && errorMsg && (
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--error)",
              marginTop: "0.25rem",
            }}
          >
            {errorMsg}
          </p>
        )}
      </div>

      {(status === "done" || street) && (
        <>
          <div className="fd-field">
            <label className="fd-label" htmlFor="street-input">
              Rua / Logradouro
            </label>
            <input
              id="street-input"
              name="street"
              type="text"
              className="fd-input"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
            />
          </div>

          <div className="form-grid-2">
            <div className="fd-field">
              <label className="fd-label" htmlFor="number-input">
                Número
              </label>
              <input
                id="number-input"
                name="number"
                type="text"
                className="fd-input"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
            </div>
            <div className="fd-field">
              <label className="fd-label" htmlFor="complement-input">
                Complemento
              </label>
              <input
                id="complement-input"
                name="complement"
                type="text"
                className="fd-input"
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
              />
            </div>
          </div>

          <div className="fd-field">
            <label className="fd-label" htmlFor="neighborhood-input">
              Bairro
            </label>
            <input
              id="neighborhood-input"
              name="neighborhood"
              type="text"
              className="fd-input"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
            />
          </div>

          <div className="form-grid-2">
            <div className="fd-field">
              <label className="fd-label" htmlFor="city-input">
                Cidade
              </label>
              <input
                id="city-input"
                name="city"
                type="text"
                className="fd-input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="fd-field">
              <label className="fd-label" htmlFor="state-input">
                Estado (UF)
              </label>
              <input
                id="state-input"
                name="state"
                type="text"
                className="fd-input"
                value={state}
                onChange={(e) => setState(e.target.value)}
                maxLength={2}
              />
            </div>
          </div>

          {lat !== null && lng !== null && (
            <p style={{ fontSize: "0.75rem", color: "var(--success)" }}>
              ✓ Localização encontrada ({lat.toFixed(4)}, {lng.toFixed(4)})
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default CepInput;
