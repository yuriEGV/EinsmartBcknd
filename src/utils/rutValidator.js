export function validarRUT(rutCompleto) {
    if (typeof rutCompleto !== 'string' || !rutCompleto.trim()) return false;
    
    // Limpiar todo excepto números y K
    let valor = rutCompleto.replace(/[^0-9kK]+/g, '').toUpperCase();
    
    if (valor.length < 2) return false;
    
    let cuerpo = valor.slice(0, -1);
    let dv = valor.slice(-1).toUpperCase();
    
    // Calcular Dígito Verificador
    let suma = 0;
    let multiplo = 2;
    
    for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += multiplo * parseInt(cuerpo.charAt(i));
        multiplo = (multiplo === 7) ? 2 : multiplo + 1;
    }
    
    let dvEsperado;
    let res = 11 - (suma % 11);
    
    if (res === 11) dvEsperado = '0';
    else if (res === 10) dvEsperado = 'K';
    else dvEsperado = String(res);
    
    return dv === dvEsperado;
}

export function formatearRUT(rut) {
    if (!rut) return '';
    let valor = rut.replace(/[^0-9kK]+/g, '').toUpperCase();
    if (valor.length < 2) return valor;
    
    let cuerpo = valor.slice(0, -1);
    let dv = valor.slice(-1);
    
    return cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + dv;
}
