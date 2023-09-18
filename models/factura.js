const { Schema, model } = require("mongoose");

// Esquema para los detalles de la factura
const DetalleSchema = Schema({
	codigoProductoSin: { type: Number },
	codigoProducto: { type: String, required: true },
	descripcion: { type: String, required: true },
	cantidad: { type: Number, required: true },
	unidadMedida: { type: Number, required: true },
	precioUnitario: { type: Number, required: true },
	montoDescuento: { type: Number },
	subTotal: { type: Number, required: true },
	numeroSerie: { type: String },
	numeroImei: { type: String },
	productoNombre: { type: String, required: true },
});

// Esquema principal de la factura
const FacturaSchema = Schema({
	actividadEconomica: {
		type: String,
		default: "Importadora de materiales de construcción",
	},
	nitEmisor: { type: String, default: "1021545021" },
	razonSocialEmisor: {
		type: String,
		default: "Importadora AQUISAN",
	},
	municipio: { type: String, required: true },
	telefono: { type: String },
	numeroFactura: { type: Number, required: true },
	cuf: { type: String, required: true },
	cufd: { type: String },
	codigoSucursal: { type: Number, required: true },
	direccion: { type: String, required: true },
	codigoPuntoVenta: { type: Number },
	fechaEmision: { type: Date, required: true },
	nombreRazonSocial: { type: String },
	codigoTipoDocumentoIdentidad: { type: Number, required: true },
	numeroDocumento: { type: String, required: true },
	complemento: { type: String },
	codigoCliente: { type: String, required: true },
	codigoMetodoPago: { type: Number, default: 1 },
	numeroTarjeta: { type: Number },
	montoTotal: { type: Number, required: true },
	montoTotalSujetoIva: { type: Number, required: true },
	montoGiftCard: { type: Number },
	descuentoAdicional: { type: Number },
	codigoExcepcion: { type: Number },
	cafc: { type: String },
	codigoMoneda: { type: Number, default: 1 },
	tipoCambio: { type: Number, default: 1 },
	montoTotalMoneda: { type: Number, required: true },
	leyenda: {
		type: String,
		default:
			"Ley N° 453: El proveedor deberá entregar el producto en las modalidades y términos ofertados o convenidos.",
	},
	usuario: { type: String, required: true },
	codigoDocumentoSector: { type: Number, default: 1 },
	detalles: [DetalleSchema], // Lista de detalles de la factura
});

FacturaSchema.methods.toJSON = function () {
	const { __v, ...data } = this.toObject();
	return data;
};

module.exports = model("Factura", FacturaSchema);
