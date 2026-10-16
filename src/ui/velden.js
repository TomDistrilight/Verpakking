import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Getal(props) {
    return (_jsxs("label", { className: `veld${props.uit ? ' uit' : ''}`, children: [_jsx("span", { className: "veld-label", children: props.label }), _jsxs("span", { className: "invoer-met-eenheid", children: [_jsx("input", { id: props.id, inputMode: "decimal", value: props.waarde, disabled: props.uit, onChange: (e) => props.onChange(e.target.value), "aria-label": props.label }), props.eenheid && _jsx("span", { className: "eenheid", children: props.eenheid })] }), props.hint && _jsx("span", { className: "hint", children: props.hint })] }));
}
export function Tekst(props) {
    return (_jsxs("label", { className: "veld", children: [_jsx("span", { className: "veld-label", children: props.label }), _jsx("input", { value: props.waarde, list: props.lijst, placeholder: props.placeholder, onChange: (e) => props.onChange(e.target.value), "aria-label": props.label })] }));
}
export function Vink(props) {
    return (_jsxs("label", { className: `vink${props.uit ? ' uit' : ''}`, children: [_jsx("input", { type: "checkbox", checked: props.aan, disabled: props.uit, onChange: (e) => props.onChange(e.target.checked) }), _jsx("span", { children: props.label })] }));
}
export function Keuze(props) {
    return (_jsxs("label", { className: "veld", children: [_jsx("span", { className: "veld-label", children: props.label }), _jsx("select", { value: props.waarde, onChange: (e) => props.onChange(e.target.value), "aria-label": props.label, children: props.opties.map((o) => (_jsx("option", { value: o.waarde, children: o.tekst }, o.waarde))) })] }));
}
export function Sectie(props) {
    return (_jsxs("section", { className: "sectie", children: [_jsxs("div", { className: "sectie-kop", children: [_jsx("h3", { children: props.titel }), props.rechts] }), props.children] }));
}
export function Rij(props) {
    return _jsx("div", { className: "rij", children: props.children });
}
export function Svg(props) {
    return _jsx("div", { className: `svg ${props.className ?? ''}`, title: props.titel, dangerouslySetInnerHTML: { __html: props.svg } });
}
