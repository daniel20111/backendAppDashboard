//controlador de dashboard

const { response } = require("express");
const Dashboard = require("../models/dashboard");
const Stock = require("../models/stock");
const Sucursal = require("../models/sucursal");
const Cotizacion = require("../models/cotizacion");
const Movimiento = require("../models/movimiento");
const cron = require("node-cron");
const mongoose = require("mongoose");

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
		const dashboard = await Dashboard.findOne({ sucursal: id })
			.populate("sucursal", "nombre")
			.populate({
				path: "movimientosRecientes",
				model: "Movimiento",
				populate: [
					{
						path: "usuario",
						model: "Usuario",
						select: "nombre",
					},
					{
						path: "stock",
						populate: [
							{
								path: "producto",
								model: "Producto",
								select: "nombre img",
							},
							{
								path: "sucursal",
								model: "Sucursal",
								select: "municipio",
							},
						],
					},
					{
						path: "verificado_por",
						model: "Usuario",
						select: "nombre",
					},
				],
			});

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

//obtener todos los dashboards
const obtenerTodosLosDashboards = async (req, res = response) => {
	try {
		// Obtener todos los dashboards
		const dashboards = await Dashboard.find()
			.populate("sucursal", "municipio codigoSucursal")
			.populate({
				path: "movimientosRecientes",
				model: "Movimiento",
				populate: [
					{
						path: "usuario",
						model: "Usuario",
						select: "nombre img",
					},
					{
						path: "stock",
						populate: [
							{
								path: "producto",
								model: "Producto",
								select: "nombre img",
							},
							{
								path: "sucursal",
								model: "Sucursal",
								select: "municipio",
							},
						],
					},
					{
						path: "verificado_por",
						model: "Usuario",
						select: "nombre",
					},
				],
			});

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
		const stocksDeSucursal = await Stock.find(
			{ sucursal: mongoose.Types.ObjectId(sucursalId) },
			"_id"
		);
		const stockIds = stocksDeSucursal.map((stock) => stock._id);

		// Obtenemos todos los tipos de movimientos para los stocks seleccionados
		const totalMovimientosVerificados = await Movimiento.countDocuments({
			stock: { $in: stockIds },
			verificacion: { $ne: "EN ESPERA" },
		});
		const totalMermas = await Movimiento.countDocuments({
			stock: { $in: stockIds },
			movimiento: "MERMA",
		});
		const totalEntradas = await Movimiento.countDocuments({
			stock: { $in: stockIds },
			movimiento: "ENTRADA",
		});
		const totalSalidas = await Movimiento.countDocuments({
			stock: { $in: stockIds },
			movimiento: "SALIDA",
		});
		const totalErrores = await Movimiento.countDocuments({
			stock: { $in: stockIds },
			verificacion: "ERROR",
		});
		const totalMovimientosNoVerificados = await Movimiento.countDocuments({
			stock: { $in: stockIds },
			verificacion: "EN ESPERA",
		});

		let porcentajeMermas = 0;
		let porcentajeEntradas = 0;
		let porcentajeSalidas = 0;
		let porcentajeErrores = 0;
		let porcentajeVerificados = 0;
		let porcentajePendientes = 0;

		// Código existente para obtener contadores

		const totalGeneralVerificacion =
			totalMovimientosVerificados +
			totalErrores +
			totalMovimientosNoVerificados;
		const totalGeneralMovimiento = totalMermas + totalEntradas + totalSalidas;

		if (totalGeneralVerificacion > 0) {
			porcentajeVerificados =
				(totalMovimientosVerificados / totalGeneralVerificacion) * 100;
			porcentajeErrores = (totalErrores / totalGeneralVerificacion) * 100;
			porcentajePendientes =
				(totalMovimientosNoVerificados / totalGeneralVerificacion) * 100;
		}

		if (totalGeneralMovimiento > 0) {
			porcentajeMermas = (totalMermas / totalGeneralMovimiento) * 100;
			porcentajeEntradas = (totalEntradas / totalGeneralMovimiento) * 100;
			porcentajeSalidas = (totalSalidas / totalGeneralMovimiento) * 100;
		}

		// Obtener las estadísticas del producto basadas solo en cajas
		const productoStats = await Cotizacion.aggregate([
			{ $match: { sucursal: sucursalId, vendido: true } },
			{ $unwind: "$productos" },
			{
				$lookup: {
					from: "productos", // Asegúrate de que este sea el nombre correcto de tu colección de productos
					localField: "productos.producto",
					foreignField: "_id",
					as: "productoInfo",
				},
			},
			{ $unwind: "$productoInfo" },
			{
				$group: {
					_id: "$productoInfo.nombre",
					totalVendidoCajas: { $sum: "$productos.cantidadCajas" },
					totalMontoCajas: { $sum: "$productos.precioTotalCajas" },
				},
			},
			{ $sort: { totalVendidoCajas: -1, totalMontoCajas: -1 } },
		]);

		let productoMasVendido = productoStats[0]?._id || null;
		let productoMasVendidoCantidad = productoStats[0]?.totalVendidoCajas || 0;

		let productoMenosVendido = productoStats.reverse()[0]?._id || null;
		let productoMenosVendidoCantidad = productoStats[0]?.totalVendidoCajas || 0;

		let productoMasRentable =
			productoStats.sort((a, b) => b.totalMontoCajas - a.totalMontoCajas)[0]
				?._id || null;
		let productoMasRentableMonto = productoStats[0]?.totalMontoCajas || 0;

		let productoMenosRentable = productoStats.reverse()[0]?._id || null;
		let productoMenosRentableMonto = productoStats[0]?.totalMontoCajas || 0;

		// 1. Intenta obtener el dashboard actual de la sucursal
		let dashboardActual = await Dashboard.findOne({ sucursal: sucursalId });
		let movimientosRecientesActuales = [];

		if (dashboardActual) {
			movimientosRecientesActuales = dashboardActual.movimientosRecientes;
		}

		// 2. Obtener los 10 últimos movimientos de la sucursal
		const ultimosMovimientos = await Movimiento.find({
			stock: { $in: stockIds },
		})
			.sort({ fecha: -1 })
			.limit(10)
			.select("_id");

		const idsUltimosMovimientos = ultimosMovimientos.map(
			(movimiento) => movimiento._id
		);

		// 3. Combinar y ordenar ambos conjuntos de movimientos
		const movimientosCombinados = [
			...movimientosRecientesActuales,
			...idsUltimosMovimientos,
		];
		const movimientosOrdenados = await Movimiento.find({
			_id: { $in: movimientosCombinados },
		})
			.sort({ fecha: -1 })
			.limit(10)
			.select("_id");

		// 4. Tomar los 10 movimientos más recientes
		const idsMovimientosActualizados = movimientosOrdenados.map(
			(movimiento) => movimiento._id
		);

		// Actualizar el dashboard
		await Dashboard.findOneAndUpdate(
			{ sucursal: sucursalId },
			{
				montoVentasAnual,
				montoVentasMensual,
				montoVentasDiario,
				montoVentasPorMesAnual,
				metasDeVentas,
				porcentajeVerificados,
				porcentajePendientes,
				porcentajeErrores,
				porcentajeMermas,
				porcentajeSalidas,
				porcentajeEntradas,
				productoMasVendido,
				productoMasVendidoCantidad,
				productoMenosVendido,
				productoMenosVendidoCantidad,
				productoMasRentable,
				productoMasRentableMonto,
				productoMenosRentable,
				productoMenosRentableMonto,
				movimientosRecientes: idsMovimientosActualizados,
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

// cron.schedule("*/1 * * * *", async () => {
// 	console.log("Actualizando todos los dashboards. Hora:", new Date());
// 	await actualizarTodosLosDashboards();
// });

module.exports = {
	obtenerDashboardPorId,
	obtenerTodosLosDashboards,
};
