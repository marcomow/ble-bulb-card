class BleBulbCard extends HTMLElement {
    static get tag() {
        return 'ble-bulb-card';
    }
    setConfig(config) {

        this.config = config;

        if (!config['bulb-types']) {

            throw new Error('You must specify a bulb type');

        }
        const array_types_bulb = [
            {
                type: 'triones',
                prefix: 'Triones-'
            },
            {
                type: 'magicblue',
                prefix: 'LEDBLE-'
            }
        ];

        this.array_prefixes = array_types_bulb
            .filter(object_type_bulb => config['bulb-types'].includes(object_type_bulb.type))
            .map(object_type_bulb => object_type_bulb.prefix);

        if (this.array_prefixes.length < 1) {

            throw new Error(`This types chosen are not supported. Please choose one of the following: "${array_types_bulb.map(a=>a.type).join('","')}"`);

        }

    }
    connectedCallback() {

        const condition_firstRun = !this.content;

        if (condition_firstRun) {

            const card = document.createElement('ha-card');
            card.header = this.config.header || 'BLE light';

            this.appendChild(card);

            const style = document.createElement('style');

            style.innerHTML = `
.p-4{padding: 1rem;}
.flex{display:flex}
.m-auto{margin: auto;}
.border-2{border-width: 2px;}
.px-2{padding-left: 0.5rem;padding-right: 0.5rem;}
.py-1{padding-top: 0.25rem;padding-bottom: 0.25rem;}
.bg-blue-600{background-color: #3182ce;}
.cursor-pointer{cursor: pointer;}
.cursor-not-allowed{cursor: not-allowed;}
`;

            card.appendChild(style);

            this.content = document.createElement('div');

            this.content.classList.add('p-4');

            card.appendChild(this.content);

            const interface_bulb = document.createElement('interface-bulb');

            interface_bulb.array_prefixes = this.array_prefixes;

            interface_bulb.innerHTML = `
        <div class="flex">
            <button id="button_connect" class="m-auto border-2 px-2 py-1 bg-blue-600"><ha-icon icon="mdi:link-variant"></ha-icon></button>
            <button id="button_disconnect" class="m-auto border-2 px-2 py-1 bg-blue-600" disabled><ha-icon icon="mdi:link-variant-off"></ha-icon></button>
            <span id="status_connection" class="m-auto px-2 py-1">disconnected</span>
            <button is="${ButtonCommand.tag}" value="204, 35, 51" class="m-auto border-2 px-2 py-1"><ha-icon icon="mdi:lightbulb"></ha-icon></button>
            <button is="${ButtonCommand.tag}" value="204, 36, 51" class="m-auto border-2 px-2 py-1"><ha-icon icon="mdi:lightbulb-off-outline"></ha-icon></button>
            <input is="${PickerColorCommand.tag}" class="m-auto border-2 px-2 py-1">
        </div>
    `;

            this.content.appendChild(interface_bulb);
        }

    }
}
customElements.define(BleBulbCard.tag, BleBulbCard);




const is_Disableable = {
    enable(condition_enable = true, element_destination) {

        const element = element_destination || this;

        element[condition_enable ? 'removeAttribute' : 'setAttribute']('disabled', true);

        element.classList[condition_enable ? 'add' : 'remove']('cursor-pointer', 'bg-blue-600');
        element.classList[condition_enable ? 'remove' : 'add']('cursor-not-allowed');

        element.classList[!condition_enable ? 'add' : 'remove']('cursor-not-allowed');
        element.classList[!condition_enable ? 'remove' : 'add']('cursor-pointer', 'bg-blue-600');

        const element_status = (this instanceof InterfaceBulb ? this : this.closest(InterfaceBulb.tag)).querySelector('#status_connection');

        if (element_status) {
            element_status.innerHTML = condition_enable ? '🟢' : '⚫';
        }
    },
    disable(condition_disable = true, element_destination) {

        this.enable(!condition_disable, element_destination);

    }
}

class InterfaceBulb extends HTMLElement {
    #device;
    #server;
    #service;
    #characteristic;
    static get tag() {
        return 'interface-bulb';
    }
    connectedCallback() {

        const element_button_connect = this.querySelector('#button_connect');

        element_button_connect.addEventListener('click', async () => {

            this.connect();

        });

        const element_button_disconnect = this.querySelector('#button_disconnect');

        element_button_disconnect.addEventListener('click', async () => {

            this.#device.gatt.disconnect();
        });

        this.disable(true, element_button_disconnect);

        this.addEventListener('ble_connection', (object_event) => {

            this.disable(object_event.detail.connected, element_button_connect);
            this.enable(object_event.detail.connected, element_button_disconnect);

            this.querySelectorAll(`[is="${ButtonCommand.tag}"],[is="${PickerColorCommand.tag}"]`)
                .forEach((element) => {

                    element.enable(object_event.detail.connected);

                });

        });


    }
    async connect() {

        this.disable(true, this.querySelector('#button_connect'));

        this.querySelector('#status_connection').innerHTML = '🟠';

        try {
            const object_filters = {
                filters: this.array_prefixes.map((prefix) => {
                    return {
                        namePrefix: prefix
                    }
                }),
                optionalServices: [0xffd5]
            };

            this.#device = await navigator.bluetooth.requestDevice(object_filters);

            this.#device.ongattserverdisconnected = (error) => {

                this.dispatchEvent(new CustomEvent('ble_connection', {
                    detail: {
                        connected: false
                    }
                }));

            }

            this.#server = await this.#device.gatt.connect();

            this.#service = await this.#server.getPrimaryService(0xffd5);

            this.#characteristic = await this.#service.getCharacteristic(0xffd9);

            this.querySelector('#status_connection').innerHTML = '🟢';

            this.dispatchEvent(new CustomEvent('ble_connection', {
                detail: {
                    connected: true
                }
            }));

        } catch (error) {

            this.dispatchEvent(new CustomEvent('ble_connection', {
                detail: {
                    connected: false
                }
            }));

        }
    }
    writeValue(value) {

        this.#characteristic.writeValue(value);

    }
}
Object.assign(InterfaceBulb.prototype, is_Disableable);
customElements.define(InterfaceBulb.tag, InterfaceBulb);

const is_InterfaceCommand = {
    async send_command(value) {

        const interface_bulb = this.closest(InterfaceBulb.tag);

        interface_bulb.writeValue(new Uint8Array(value));

    }
};

class ButtonCommand extends HTMLButtonElement {
    static get tag() {
        return 'button-command';
    }
    connectedCallback() {

        this.disable();

        const value = this.getAttribute('value').split(',');

        this.addEventListener('click', async () => {

            this.send_command(value);

        });

    }
}
Object.assign(ButtonCommand.prototype, is_InterfaceCommand);
Object.assign(ButtonCommand.prototype, is_Disableable);
customElements.define(ButtonCommand.tag, ButtonCommand, {
    extends: 'button'
});


class PickerColorCommand extends HTMLInputElement {
    static get tag() {
        return 'picker-color-command';
    }
    constructor() {
        super();
        this.type = 'color';
    }
    connectedCallback() {

        this.disable();

        const convert_hex_to_RGB = (hex) =>
            hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (m, r, g, b) => '#' + r + r + g + g + b + b)
            .substring(1).match(/.{2}/g)
            .map(x => parseInt(x, 16));

        this.addEventListener('change', async () => {

            const array_RGB = convert_hex_to_RGB(this.value);

            this.send_command([0x56, ...array_RGB, 0x00, 0xF0, 0xAA]);

        });

    }
}
Object.assign(PickerColorCommand.prototype, is_InterfaceCommand);
Object.assign(PickerColorCommand.prototype, is_Disableable);
customElements.define(PickerColorCommand.tag, PickerColorCommand, {
    extends: 'input'
});
