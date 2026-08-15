import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOrder } from "../../context/useOrder";
import { useAuth } from "../../context/useAuth";
import styles from "./Delivery.module.css";
import Navbar from "../../components/Navbar/Navbar";

export default function Delivery() {
  const navigate = useNavigate();
  const { state, dispatch } = useOrder();
  const { cliente } = useAuth();

  const [form, setForm] = useState({
    // Pré-preenche a partir do que já está no pedido ou do cliente autenticado.
    name: state.deliveryDetails.name || cliente?.nome || "",
    company: state.deliveryDetails.company || "",
    location: state.deliveryDetails.location || "",
    // Telefone do cliente autenticado (formato local, sem prefixo 258).
    contact:
      state.deliveryDetails.contact ||
      (cliente?.telefone ? cliente.telefone.replace(/^258/, "") : ""),
  });

  const [errors, setErrors] = useState({});

  // Guard clause with useEffect
  useEffect(() => {
    if (state.orderItems.length === 0) {
      navigate("/menu");
    }
  }, [state.orderItems.length, navigate]);

  if (state.orderItems.length === 0) {
    return null;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Limpa o erro do campo ao começar a escrever
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  }

  function validar() {
    const novosErros = {};
    if (!form.name.trim()) novosErros.name = "Nome é obrigatório";
    if (!form.location.trim())
      novosErros.location = "Local de entrega é obrigatório";
    if (!form.contact.trim()) novosErros.contact = "Contacto é obrigatório";
    return novosErros;
  }

  function handleSubmit() {
    const novosErros = validar();
    if (Object.keys(novosErros).length > 0) {
      setErrors(novosErros);
      return;
    }
    dispatch({ type: "SET_DELIVERY_DETAILS", payload: form });
    navigate("/checkout");
  }

  return (
    <div className={styles.page}>
      <Navbar /> {/* Navbar comum a todas as páginas */}
      <main className={styles.main}>
        <h1 className={styles.title}>Detalhes de Entrega</h1>

        <div className={styles.card}>
          <div className={styles.campo}>
            <label className={styles.label}>Nome *</label>
            <input
              className={`${styles.input} ${errors.name ? styles.inputErro : ""}`}
              type="text"
              name="name"
              placeholder="O seu nome completo"
              value={form.name}
              onChange={handleChange}
            />
            {errors.name && <p className={styles.erro}>{errors.name}</p>}
          </div>

          <div className={styles.campo}>
            <label className={styles.label}>Empresa</label>
            <input
              className={styles.input}
              type="text"
              name="company"
              placeholder="Nome da empresa (opcional)"
              value={form.company}
              onChange={handleChange}
            />
          </div>

          <div className={styles.campo}>
            <label className={styles.label}>Local de entrega *</label>
            <input
              className={`${styles.input} ${errors.location ? styles.inputErro : ""}`}
              type="text"
              name="location"
              placeholder="Ex: Escritório 3º andar, Recepção..."
              value={form.location}
              onChange={handleChange}
            />
            {errors.location && (
              <p className={styles.erro}>{errors.location}</p>
            )}
          </div>

          <div className={styles.campo}>
            <label className={styles.label}>Contacto *</label>
            <input
              className={`${styles.input} ${errors.contact ? styles.inputErro : ""}`}
              type="tel"
              name="contact"
              placeholder="Número de telefone"
              value={form.contact}
              onChange={handleChange}
            />
            {errors.contact && <p className={styles.erro}>{errors.contact}</p>}
          </div>
        </div>

        <button className={styles.btnConfirmar} onClick={handleSubmit}>
          Confirmar pedido
        </button>
      </main>
    </div>
  );
}
