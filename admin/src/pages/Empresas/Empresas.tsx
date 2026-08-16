import { useEffect, useMemo, useState } from 'react'
import { useAdmin } from '../../context/useAdmin'
import { Header, Card, Button } from '../../components'
import type { ApiEmpresa, ApiEmpresaMenu } from '../../lib/api'
import styles from './Empresas.module.css'

interface EmpresaFormState {
	nome: string
	ativo: boolean
	nrFuncionariosPagos: number
	maxUsosDia: number
	menuNome: string
	pratoIds: string[]
}

const EMPTY_FORM: EmpresaFormState = {
	nome: '',
	ativo: true,
	nrFuncionariosPagos: 1,
	maxUsosDia: 1,
	menuNome: 'Menu principal',
	pratoIds: [],
}

export function Empresas() {
	const {
		state,
		loadEmpresas,
		createEmpresa,
		updateEmpresa,
		deleteEmpresa,
		regenerateEmpresaCodes,
		toggleEmpresaCode,
		createEmpresaMenu,
		updateEmpresaMenu,
		deleteEmpresaMenu,
	} = useAdmin()

	const [form, setForm] = useState<EmpresaFormState>(EMPTY_FORM)
	const [editingEmpresa, setEditingEmpresa] = useState<ApiEmpresa | null>(null)
	const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>('')
	const [menuNome, setMenuNome] = useState('')
	const [menuPratoIds, setMenuPratoIds] = useState<string[]>([])
	const [actionError, setActionError] = useState<string | null>(null)
	const [saving, setSaving] = useState(false)
	const [limiteDiarioInput, setLimiteDiarioInput] = useState(1)

	useEffect(() => {
		void loadEmpresas().catch((e) => setActionError((e as Error).message))
	}, [loadEmpresas])

	const pratos = state.pratos
	const selectedEmpresa = useMemo(
		() => state.empresas.find((e) => e._id === selectedEmpresaId) ?? null,
		[selectedEmpresaId, state.empresas]
	)

	useEffect(() => {
		if (selectedEmpresa) {
			setLimiteDiarioInput(selectedEmpresa.maxUsosDia)
		}
	}, [selectedEmpresa])

	function resetForm() {
		setEditingEmpresa(null)
		setForm(EMPTY_FORM)
	}

	function togglePratoSelection(pratoId: string) {
		setForm((prev) => ({
			...prev,
			pratoIds: prev.pratoIds.includes(pratoId)
				? prev.pratoIds.filter((id) => id !== pratoId)
				: [...prev.pratoIds, pratoId],
		}))
	}

	async function handleSubmitEmpresa(e: React.FormEvent) {
		e.preventDefault()
		if (!form.nome.trim()) {
			setActionError('Nome da empresa é obrigatório')
			return
		}
		if (!form.pratoIds.length) {
			setActionError('Selecione pelo menos um prato para o menu inicial')
			return
		}
		if (!Number.isInteger(form.maxUsosDia) || form.maxUsosDia < 1) {
			setActionError('Limite diário deve ser um inteiro >= 1')
			return
		}

		try {
			setSaving(true)
			setActionError(null)
			if (editingEmpresa) {
				await updateEmpresa(editingEmpresa._id, {
					nome: form.nome,
					ativo: form.ativo,
					nrFuncionariosPagos: form.nrFuncionariosPagos,
					maxUsosDia: form.maxUsosDia,
				})
			} else {
				await createEmpresa(form)
			}
			resetForm()
		} catch (e) {
			setActionError((e as Error).message)
		} finally {
			setSaving(false)
		}
	}

	function startEdit(empresa: ApiEmpresa) {
		setEditingEmpresa(empresa)
		const firstMenu = empresa.menus.find((m) => m.ativo) ?? empresa.menus[0]
		const pratoIds = (firstMenu?.pratoIds ?? []).map((p) => typeof p === 'string' ? p : p._id)
		setForm({
			nome: empresa.nome,
			ativo: empresa.ativo,
			nrFuncionariosPagos: empresa.nrFuncionariosPagos,
			maxUsosDia: empresa.maxUsosDia,
			menuNome: firstMenu?.nome ?? 'Menu principal',
			pratoIds,
		})
	}

	async function handleDeleteEmpresa(id: string) {
		if (!confirm('Remover esta empresa?')) return
		try {
			await deleteEmpresa(id)
			if (selectedEmpresaId === id) setSelectedEmpresaId('')
		} catch (e) {
			setActionError((e as Error).message)
		}
	}

	async function handleCreateMenu(e: React.FormEvent) {
		e.preventDefault()
		if (!selectedEmpresa) return
		if (!menuNome.trim()) {
			setActionError('Nome do menu é obrigatório')
			return
		}
		if (!menuPratoIds.length) {
			setActionError('Selecione pelo menos um prato para o menu')
			return
		}

		try {
			setActionError(null)
			await createEmpresaMenu(selectedEmpresa._id, { nome: menuNome.trim(), ativo: true, pratoIds: menuPratoIds })
			setMenuNome('')
			setMenuPratoIds([])
		} catch (e) {
			setActionError((e as Error).message)
		}
	}

	async function handleToggleMenu(menu: ApiEmpresaMenu) {
		if (!selectedEmpresa) return
		const pratoIds = menu.pratoIds.map((p) => typeof p === 'string' ? p : p._id)
		try {
			await updateEmpresaMenu(selectedEmpresa._id, menu._id, { ativo: true, pratoIds })
		} catch (e) {
			setActionError((e as Error).message)
		}
	}

	async function handleDeleteMenu(menuId: string) {
		if (!selectedEmpresa) return
		if (!confirm('Remover este menu?')) return
		try {
			await deleteEmpresaMenu(selectedEmpresa._id, menuId)
		} catch (e) {
			setActionError((e as Error).message)
		}
	}

	async function handleSalvarLimiteDiario() {
		if (!selectedEmpresa) return
		if (!Number.isInteger(limiteDiarioInput) || limiteDiarioInput < 1) {
			setActionError('Limite diário deve ser um inteiro >= 1')
			return
		}

		try {
			setActionError(null)
			await updateEmpresa(selectedEmpresa._id, { maxUsosDia: limiteDiarioInput })
		} catch (e) {
			setActionError((e as Error).message)
		}
	}

	return (
		<div className={styles.page}>
			<Header title="Empresas" subtitle="Gerir empresas, menus e códigos de funcionários" />

			{actionError && (
				<Card className={styles.errorCard}>
					<span>{actionError}</span>
					<button type="button" onClick={() => setActionError(null)}>x</button>
				</Card>
			)}

			<div className={styles.grid}>
				<Card className={styles.panel}>
					<h3>{editingEmpresa ? 'Editar Empresa' : 'Nova Empresa'}</h3>
					<form onSubmit={handleSubmitEmpresa} className={styles.form}>
						<label>
							Nome
							<input value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} required />
						</label>
						<label>
							Funcionários pagos
							<input
								type="number"
								min={1}
								value={form.nrFuncionariosPagos}
								onChange={(e) => setForm((p) => ({ ...p, nrFuncionariosPagos: Number(e.target.value) || 1 }))}
							/>
						</label>
						<label>
							Limite diário do código
							<input
								type="number"
								min={1}
								value={form.maxUsosDia}
								onChange={(e) => setForm((p) => ({ ...p, maxUsosDia: Number(e.target.value) || 1 }))}
							/>
						</label>
						<label>
							Menu inicial
							<input value={form.menuNome} onChange={(e) => setForm((p) => ({ ...p, menuNome: e.target.value }))} />
						</label>
						<label className={styles.check}>
							<input
								type="checkbox"
								checked={form.ativo}
								onChange={(e) => setForm((p) => ({ ...p, ativo: e.target.checked }))}
							/>
							Empresa ativa
						</label>

						<div>
							<p>Pratos do menu inicial</p>
							<div className={styles.chips}>
								{pratos.map((prato) => (
									<label key={prato._id} className={styles.chip}>
										<input
											type="checkbox"
											checked={form.pratoIds.includes(prato._id)}
											onChange={() => togglePratoSelection(prato._id)}
										/>
										<span>{prato.nome}</span>
									</label>
								))}
							</div>
						</div>

						<div className={styles.actions}>
							{editingEmpresa && <Button type="button" variant="secondary" onClick={resetForm}>Cancelar</Button>}
							<Button type="submit" disabled={saving}>{saving ? 'A guardar...' : (editingEmpresa ? 'Atualizar' : 'Criar empresa')}</Button>
						</div>
					</form>
				</Card>

				<Card className={styles.panel}>
					<h3>Empresas cadastradas</h3>
					<div className={styles.list}>
						{state.empresas.map((empresa) => (
							<div key={empresa._id} className={styles.listItem}>
								<div>
									<strong>{empresa.nome}</strong>
									<p>{empresa.nrFuncionariosPagos} funcionários pagos</p>
									<small>{empresa.ativo ? 'Ativa' : 'Inativa'} · Código único</small>
								</div>
								<div className={styles.itemActions}>
									<Button size="small" variant="secondary" onClick={() => setSelectedEmpresaId(empresa._id)}>Ver detalhes</Button>
									<Button size="small" variant="secondary" onClick={() => startEdit(empresa)}>Editar</Button>
									<Button size="small" variant="danger" onClick={() => handleDeleteEmpresa(empresa._id)}>Excluir</Button>
								</div>
							</div>
						))}
						{state.empresas.length === 0 && <p>Nenhuma empresa cadastrada.</p>}
					</div>
				</Card>
			</div>

			{selectedEmpresa && (
				<div className={styles.grid}>
					<Card className={styles.panel}>
						<h3>Menus de {selectedEmpresa.nome}</h3>
						<form onSubmit={handleCreateMenu} className={styles.form}>
							<label>
								Novo menu
								<input value={menuNome} onChange={(e) => setMenuNome(e.target.value)} placeholder="Ex.: Menu Executivo" />
							</label>
							<div>
								<p>Pratos do menu</p>
								<div className={styles.chips}>
									{pratos.map((prato) => (
										<label key={prato._id} className={styles.chip}>
											<input
												type="checkbox"
												checked={menuPratoIds.includes(prato._id)}
												onChange={() => setMenuPratoIds((prev) => prev.includes(prato._id)
													? prev.filter((id) => id !== prato._id)
													: [...prev, prato._id])}
											/>
											<span>{prato.nome}</span>
										</label>
									))}
								</div>
							</div>
							<Button type="submit">Criar menu ativo</Button>
						</form>

						<div className={styles.list}>
							{selectedEmpresa.menus.map((menu) => (
								<div key={menu._id} className={styles.listItem}>
									<div>
										<strong>{menu.nome}</strong>
										<p>{menu.pratoIds.length} pratos</p>
										<small>{menu.ativo ? 'Ativo' : 'Inativo'}</small>
									</div>
									<div className={styles.itemActions}>
										{!menu.ativo && <Button size="small" variant="secondary" onClick={() => handleToggleMenu(menu)}>Ativar</Button>}
										<Button size="small" variant="danger" onClick={() => handleDeleteMenu(menu._id)}>Excluir</Button>
									</div>
								</div>
							))}
						</div>
					</Card>

					<Card className={styles.panel}>
						<h3>Códigos de Funcionário</h3>
						<div className={styles.listItem}>
							<div>
								<strong>{selectedEmpresa.codigo}</strong>
								<p>Usos hoje: {selectedEmpresa.usosDiaAtual}/{selectedEmpresa.maxUsosDia}</p>
							</div>
							<div className={styles.itemActions}>
								<Button
									size="small"
									variant={selectedEmpresa.codigoAtivo ? 'danger' : 'success'}
									onClick={() => toggleEmpresaCode(selectedEmpresa._id, !selectedEmpresa.codigoAtivo)}
								>
									{selectedEmpresa.codigoAtivo ? 'Desativar' : 'Ativar'}
								</Button>
								<Button size="small" variant="secondary" onClick={() => regenerateEmpresaCodes(selectedEmpresa._id)}>
									Regenerar código
								</Button>
							</div>
						</div>
						<div className={styles.addCodesRow}>
							<input
								type="number"
								min={1}
								value={limiteDiarioInput}
								onChange={(e) => setLimiteDiarioInput(Number(e.target.value) || 1)}
								className={styles.addCodesInput}
							/>
							<Button variant="secondary" onClick={handleSalvarLimiteDiario}>
								Guardar limite diário
							</Button>
						</div>
						<div className={styles.list}>
							<p>Cada empresa possui apenas um código com limite diário de uso.</p>
						</div>
					</Card>
				</div>
			)}
		</div>
	)
}
