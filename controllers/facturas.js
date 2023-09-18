const { Factura } = require("../models"); // Asegúrate de que la ruta sea la correcta
const { Venta } = require("../models");
const { Cotizacion } = require("../models");
const { Producto } = require("../models");

const mongoose = require("mongoose");
const bigInt = require("big-integer");

const obtenerTodasLasFacturas = async (req, res) => {
	try {
		const facturas = await Factura.find().populate("detalles"); // Puedes añadir más campos para hacer populate si es necesario
		const totalFacturas = await Factura.countDocuments();

		res.status(200).json({
			success: true,
			facturas,
			total: totalFacturas,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: "Error al obtener las facturas",
		});
	}
};

const obtenerFacturaPorId = async (req, res) => {
	try {
		const { id } = req.params;

		const factura = await Factura.findById(id).populate("detalles"); // Puedes añadir más campos para hacer populate si es necesario

		if (!factura) {
			return res.status(404).json({
				success: false,
				message: "Factura no encontrada",
			});
		}

		res.status(200).json(factura);
	} catch (error) {
		res.status(500).json({
			message: "Error al obtener la factura",
		});
	}
};

const crearFactura = async (req, res) => {
	const session = await mongoose.startSession();
	session.startTransaction();
	try {
		const { ventaId } = req.body;

		// Contar el número de facturas existentes y sumarle 1
		const numeroFacturas = await Factura.countDocuments({}).session(session);
		const nuevoNumeroFactura = numeroFacturas + 1;

		const venta = await Venta.findById(ventaId)
			.populate({
				path: "usuario",
				model: "Usuario",
			})
			.populate({
				path: "movimientos",
				model: "Movimiento",
			})
			.session(session);

		if (!venta) {
			await session.abortTransaction();
			session.endSession();
			return res.status(404).json({
				success: false,
				message: "Venta no encontrada",
			});
		}

		const cotizacionId = venta.cotizacion;
		const cotizacion = await Cotizacion.findById(cotizacionId)
			.populate({
				path: "cliente",
				model: "Cliente",
			})
			.populate({
				path: "productos.producto",
				model: "Producto",
				populate: [
					{
						path: "usuario",
						model: "Usuario",
						select: "nombre",
					},
					{
						path: "categoria",
						model: "Categoria",
					},
				],
			})
			.populate({
				path: "sucursal",
				model: "Sucursal",
			})
			.session(session);

		if (!cotizacion) {
			await session.abortTransaction();
			session.endSession();
			return res.status(404).json({
				success: false,
				message: "Cotización no encontrada",
			});
		}

		const detalles = [];

		for (const item of cotizacion.productos) {
			const producto = await Producto.findById(item.producto._id)
				.populate({
					path: "categoria",
					model: "Categoria",
				})
				.session(session);

			if (item.cantidadCajas > 0) {
				const montoDescuentoCajas =
					producto.precioCaja - item.precioUnitarioCajas;
				detalles.push({
					codigoProducto: producto.codigoProducto,
					descripcion:
						producto.categoria.material +
						" " +
						producto.categoria.acabado +
						" " +
						producto.categoria.dimensiones,
					cantidad: item.cantidadCajas,
					unidadMedida: 1, // 1 para cajas
					precioUnitario: producto.precioCaja,
					montoDescuento: montoDescuentoCajas,
					subTotal: item.precioTotalCajas,
					productoNombre: producto.nombre,
				});
			}

			if (item.cantidadPiezas > 0) {
				const montoDescuentoPiezas =
					producto.precioPorUnidad - item.precioUnitarioPiezas;
				detalles.push({
					codigoProducto: producto.codigoProducto,
					descripcion:
						producto.categoria.material +
						" " +
						producto.categoria.acabado +
						" " +
						producto.categoria.dimensiones +
						" " +
						producto.categoria.dimensiones,
					cantidad: item.cantidadPiezas,
					unidadMedida: 2, // 2 para piezas
					precioUnitario: producto.precioPorUnidad,
					montoDescuento: montoDescuentoPiezas,
					subTotal: item.precioTotalPiezas,
				});
			}
		}

		const facturaData = {
			usuario: venta.usuario.codigoUsuario,
			numeroFactura: nuevoNumeroFactura,
			cuf: generarCUF({
				nit: "1021545021", // Reemplazar con el NIT real
				fechaHora: obtenerFechaHoraActual(), // Reemplazar con la fecha y hora reales
				sucursal: cotizacion.sucursal.codigoSucursal, // Reemplazar con el código de sucursal real
				modalidad: "1", // Reemplazar con la modalidad real
				tipoEmision: "1", // Reemplazar con el tipo de emisión real
				tipoFactura: "1", // Reemplazar con el tipo de factura real
				tipoDocumentoSector: "1", // Reemplazar con el tipo de documento del sector real
				numeroFactura: nuevoNumeroFactura, // Reemplazar con el número de factura real
				puntoVenta: "0", // Reemplazar con el punto de venta real
				codigoControl: "A19E23EF34124CD", // Reemplazar con el código de control real
			}),
			codigoSucursal: cotizacion.sucursal.codigoSucursal, // Asumiendo un valor por defecto
			direccion: cotizacion.sucursal.direccion,
			fechaEmision: new Date(),
			codigoCliente: cotizacion.cliente.codigoCliente,
			montoTotal: cotizacion.total,
			montoTotalSujetoIva: cotizacion.total,
			codigoMoneda: 1, // 1 para bolivianos
			montoTotalMoneda: cotizacion.total,
			codigoTipoDocumentoIdentidad: cotizacion.cliente.nit ? 1 : 2, // 1 para CI, 2 para NIT
			numeroDocumento: cotizacion.cliente.nit
				? cotizacion.cliente.nit
				: cotizacion.cliente.ci, // CI o NIT según corresponda
			nombreRazonSocial: cotizacion.cliente.nombre,
			municipio: cotizacion.sucursal.municipio,
			telefono: cotizacion.sucursal.telefono,
			detalles,
		};

		const nuevaFactura = new Factura(facturaData);
		await nuevaFactura.save({ session });

		//actualizar los campos facturado y factura de la venta
		venta.facturado = true;
		venta.factura = nuevaFactura._id;
		await venta.save({ session });

		await session.commitTransaction();
		session.endSession();

		res.status(201).json(nuevaFactura);
	} catch (error) {
		await session.abortTransaction();
		session.endSession();
		console.error(error);
		res.status(500).json({
			success: false,
			message: "Error al crear la factura",
		});
	}
};

// Función para obtener la fecha y hora actual en formato YYYYMMDDHHMMSSmmm
function obtenerFechaHoraActual() {
	const ahora = new Date();
	const fecha = ahora.toISOString().slice(0, 10).replace(/-/g, "");
	const hora = ahora.toTimeString().slice(0, 8).replace(/:/g, "");
	const milisegundos = String(ahora.getMilliseconds()).padStart(3, "0");
	return `${fecha}${hora}${milisegundos}`;
}

// Función para calcular el dígito del módulo 11
function calculaDigitoMod11(cadena, numDig = 1, limMult = 9, x10 = false) {
	let mult = 2;
	let suma = 0;
	let dig;

	for (let i = cadena.length - 1; i >= 0; i--) {
		suma += mult * parseInt(cadena[i]);

		if (++mult > limMult) {
			mult = 2;
		}
	}

	if (x10) {
		dig = ((suma * 10) % 11) % 10;
	} else {
		dig = suma % 11;
	}

	if (dig === 10) {
		cadena += "1";
	}

	if (dig === 11) {
		cadena += "0";
	}

	if (dig < 10) {
		cadena += String(dig);
	}

	return cadena.substring(cadena.length - numDig, cadena.length);
}

// Función para convertir la cadena a Base 16
function Base16(pString) {
	return bigInt(pString).toString(16).toUpperCase();
}

// Función para generar el CUF
function generarCUF(datos) {
	// Completar cada campo con ceros a la izquierda según la longitud definida
	const nit = String(datos.nit).padStart(13, "0");
	const fechaHora = datos.fechaHora;
	const sucursal = String(datos.sucursal).padStart(4, "0");
	const modalidad = String(datos.modalidad).padStart(1, "0");
	const tipoEmision = String(datos.tipoEmision).padStart(1, "0");
	const tipoFactura = String(datos.tipoFactura).padStart(1, "0");
	const tipoDocumentoSector = String(datos.tipoDocumentoSector).padStart(
		2,
		"0"
	);
	const numeroFactura = String(datos.numeroFactura).padStart(10, "0");
	const puntoVenta = String(datos.puntoVenta).padStart(4, "0");

	// Concatenar los campos
	let cadena = `${nit}${fechaHora}${sucursal}${modalidad}${tipoEmision}${tipoFactura}${tipoDocumentoSector}${numeroFactura}${puntoVenta}`;

	// Calcular el módulo 11 y adjuntarlo al final de la cadena
	const modulo11 = calculaDigitoMod11(cadena, 1, 9, false);
	cadena += modulo11;

	// Aplicar Base 16 a la cadena resultante
	const cadenaBase16 = Base16(cadena);

	// Concatenar con el código de control
	const cuf = `${cadenaBase16}${datos.codigoControl}`;

	return cuf;
}

module.exports = {
	obtenerTodasLasFacturas,
	obtenerFacturaPorId,
	crearFactura,
};
