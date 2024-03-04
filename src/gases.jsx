import React from 'react';


const gases = [
    {
        id: 1,
        particleSize: 6,
        color: 0x6666a0,
        name: 'Hydrogen',
        symbol: 'H',
        mass: 131.293,
        gasGroup: 0x0002 // red circles
    },
    {
        id: 2,
        particleSize: 8,
        color: 0xb0b000,
        name: 'Deuterium',
        symbol: 'D',
        mass: 44.009500,
        gasGroup: 0x0003 // yellow circles

    },
    {
        id: 3,
        particleSize: 9,
        color: 0x00d0f0,
        name: 'Helium3',
        symbol: 'He3',
        mass: 31.9988,
        gasGroup: 0x0004 // yellow circles

    },
    {
        id: 4,
        particleSize: 11,
        color: 0xB87B41,
        name: 'Helium4',
        symbol: 'He4',
        mass: 28.0134,
        gasGroup: 0x0005 // yellow circles

    }
];

export {gases};
