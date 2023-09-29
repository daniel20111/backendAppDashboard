//controlador de dashboard

const { response } = require("express");
const Dashboard = require("../models/dashboard");
const Stock = require("../models/stock");
const Sucursal = require("../models/sucursal");
const Cotizacion = require("../models/cotizacion");
const Movimiento = require("../models/movimiento");
const cron = require("node-cron");

//obtener dashboard por id de sucursal

const obtenerDashboardPorId = async (req, res = response) => {
	const id = req.params.id;

	try {
		// Verificar si la sucursal existe
		const sucursal = await Sucursal.findById(id);
		if (!sucursal) {
			return res.status(404).json({
				ok: false,
				msg: "Sucursal no encontrada",
			});
		}

		// Obtener el dashboard asociado a la sucursal
		const dashboard = await Dashboard.findOne({ sucursal: id }).populate(
			"sucursal",
			"nombre"
		); // populate para obtener más detalles de la sucursal si es necesario

		if (!dashboard) {
			return res.status(404).json({
				msg: "Dashboard no encontrado para esta sucursal",
			});
		}

		// Enviar respuesta
		return res.status(200).json({
			dashboard,
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			msg: "Error interno del servidor",
		});
	}
};

const obtenerTodosLosDashboards = async (req, res = response) => {
	try {
		// Obtener todos los dashboards
		const dashboards = await Dashboard.find().populate("sucursal", "municipio codigoSucursal" ); // populate para obtener más detalles de la sucursal si es necesario

		// Enviar respuesta
		return res.status(200).json({
			dashboards,
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			msg: "Error interno del servidor",
		});
	}
};

const actualizarTodosLosDashboards = async () => {
	try {
		// Obtener todas las sucursales
		const sucursales = await Sucursal.find();

		// Iterar a través de todas las sucursales para actualizar sus dashboards
		for (const sucursal of sucursales) {
			await actualizarDashboard(sucursal._id);
		}
	} catch (error) {
		console.error("Error al actualizar los Dashboards:", error);
	}
};

const actualizarDashboard = async (sucursalId) => {
	try {
		// Obtener todas las cotizaciones para una sucursal específica
		const totalCotizaciones = await Cotizacion.find({
			sucursal: sucursalId,
		}).countDocuments();

		// Obtener todas las cotizaciones vendidas para una sucursal específica
		const cotizaciones = await Cotizacion.find({
			sucursal: sucursalId,
			vendido: true,
		});

		// Calcular el porcentaje de oportunidades de negocio logradas
		let oportunidadesNegocioPorcentaje = 0;
		if (totalCotizaciones > 0) {
			oportunidadesNegocioPorcentaje =
				(cotizaciones.length / totalCotizaciones) * 100;
		}

		// Inicializar variables para almacenar las métricas
		let montoVentasAnual = 0;
		let montoVentasMensual = 0;
		let montoVentasDiario = 0;
		let montoVentasPorMesAnual = [];
		let metasDeVentas = {
			diario: 0,
			mensual: 0,
			anual: 0,
		};

		// Obtener la fecha actual y la del día, mes y año anterior
		const hoy = new Date();
		const ayer = new Date(hoy);
		ayer.setDate(hoy.getDate() - 1);
		const mesActual = hoy.getMonth();
		const mesAnterior = mesActual === 0 ? 11 : mesActual - 1;
		const anoActual = hoy.getFullYear();
		const anoAnterior = anoActual - 1;

		// Inicializar el array para los últimos 12 meses
		for (let i = 0; i < 12; i++) {
			const mes = (mesActual - i + 12) % 12;
			const ano = mesActual - i >= 0 ? anoActual : anoActual - 1;
			montoVentasPorMesAnual.push({ year: ano, month: mes, total: 0 });
		}

		// Calcular las métricas
		cotizaciones.forEach((cotizacion) => {
			const fechaCotizacion = new Date(cotizacion.fecha);
			const mesCotizacion = fechaCotizacion.getMonth();
			const anoCotizacion = fechaCotizacion.getFullYear();

			if (anoCotizacion === anoActual) {
				montoVentasAnual += cotizacion.total;

				if (mesCotizacion === mesActual) {
					montoVentasMensual += cotizacion.total;

					if (fechaCotizacion.toDateString() === ayer.toDateString()) {
						montoVentasDiario += cotizacion.total;
					}
				}

				if (mesCotizacion === mesAnterior) {
					metasDeVentas.mensual += cotizacion.total;
				}

				if (anoCotizacion === anoAnterior) {
					metasDeVentas.anual += cotizacion.total;
				}
			}

			const index = montoVentasPorMesAnual.findIndex(
				(x) => x.year === anoCotizacion && x.month === mesCotizacion
			);

			if (index !== -1) {
				montoVentasPorMesAnual[index].total += cotizacion.total;
			}
		});

		// Obtener los IDs de los stocks que pertenecen a la sucursal
		const stocksDeSucursal = await Stock.find({ sucursal: sucursalId }, "_id");

		const stockIds = stocksDeSucursal.map((stock) => stock._id);

		// Obtener todos los movimientos verificados que pertenecen a esos stocks
		const totalMovimientosVerificados = await Movimiento.find({
			stock: { $in: stockIds },
			verificacion: { $ne: "EN ESPERA" },
		}).countDocuments();

		// Obtener todos los movimientos de tipo "MERMA" y que están verificados que pertenecen a esos stocks
		const totalMermasVerificadas = await Movimiento.find({
			stock: { $in: stockIds },
			movimiento: "MERMA",
			verificacion: { $ne: "EN ESPERA" },
		}).countDocuments();

		// Obtener todos los movimientos que no están verificados que pertenecen a esos stocks
		const totalMovimientosNoVerificados = await Movimiento.find({
			stock: { $in: stockIds },
			verificacion: "EN ESPERA",
		}).countDocuments();

		// Calcular los porcentajes
		let porcentajeMermasPorcentaje = 0;
		let ordenesProcesadasPorcentaje = 0;

		if (totalMovimientosVerificados > 0) {
			porcentajeMermasPorcentaje =
				(totalMermasVerificadas / totalMovimientosVerificados) * 100;
		}

		if (totalMovimientosNoVerificados > 0) {
			ordenesProcesadasPorcentaje =
				(totalMovimientosVerificados /
					(totalMovimientosVerificados + totalMovimientosNoVerificados)) *
				100;
		}

		// Actualizar el dashboard
		await Dashboard.findOneAndUpdate(
			{ sucursal: sucursalId },
			{
				montoVentasAnual,
				montoVentasMensual,
				montoVentasDiario,
				montoVentasPorMesAnual,
				metasDeVentas,
				oportunidadesNegocioPorcentaje,
				porcentajeMermasPorcentaje,
				ordenesProcesadasPorcentaje,
			},
			{ new: true, upsert: true }
		);
	} catch (error) {
		console.error(
			`Error al actualizar el Dashboard para la sucursal ${sucursalId}:`,
			error
		);
	}
};

//cron.schedule("*/1 * * * *", async () => {
//	console.log("Actualizando todos los dashboards. Hora:", new Date());
//	await actualizarTodosLosDashboards();
//});

module.exports = {
	obtenerDashboardPorId,
	obtenerTodosLosDashboards,
};
