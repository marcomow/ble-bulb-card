# ble-bulb-card
[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg?style=for-the-badge)](https://github.com/custom-components/hacs) 

Custom card for [Home Assistant](https://www.home-assistant.io/) to directly control BLE light bulbs through Web Bluetooth.

Bluetooth interaction can be a real pain in HASS, and sometime you just need to change the color of your cheap light bulbs (Triones, MagicBlue, ...). This custom card comes to the rescue adding a bare-minimum functionality to be able to turn on, off, and change the color.


# Installation
You can install the custom card using [HACS](https://www.hacs.xyz), or just add the ble-bulb-card.js file to your config/www/ folder in HASS.

# Configuration
Add a card with the following configuration to any of your Lovelace views.
```yaml
type: 'custom:ble-bulb-card'
bulb-types:
  - triones
  - magicblue
```
| option | value |
|--|--|
| type | REQUIRED a list of BLE bulbs to search for. |

Supported values
- triones
- magicblue

# Supported devices
At the current moment only Triones (Flyidea/HappyLighting) and MagicBlue bulbs are supported .

# Known issues
Please be aware that Web Bluetooth is still an experimental technology and may not work as expected.
For instance, from my experience with Triones bulbs I noticed that several times the bulb just doesn't connect, while some others is required to connect twice to actually be able to interact with the bulb.
