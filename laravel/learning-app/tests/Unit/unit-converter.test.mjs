import test from 'node:test';
import assert from 'node:assert/strict';
import { UNIT_GROUPS, convertUnits, parseInput, referenceRelation } from '../../resources/js/unit-converter-engine.js';

const cases = [
    ['length','in','cm','1','2.54'], ['length','ft','m','1','0.3048'],
    ['length','yd','m','1','0.9144'], ['length','mi','km','1','1.609344'],
    ['mass','lb','g','1','453.59237'], ['mass','oz','g','1','28.349523125'],
    ['mass','lb','oz','1','16'], ['mass','t','kg','1','1000'],
    ['volume','dl','ml','1','100'], ['volume','cc','ml','1','1'],
    ['volume','cube','l','1','1000'], ['volume','us','l','1','3.785411784'],
    ['volume','uk','l','1','4.54609'], ['area','ha','m2','1','10000'],
    ['area','a','m2','1','100'], ['area','km2','ha','1','100'],
    ['temperature','c','f','0','32'], ['temperature','f','c','212','100'],
    ['temperature','k','c','0','-273.15'], ['temperature','f','k','-459.67','0'],
    ['temperature','c','k','-273.15','0'], ['speed','kn','kmh','1','1.852'],
    ['speed','mph','kmh','1','1.609344'], ['speed','kmh','ms','36','10'],
    ['time','day','s','1','86400'], ['time','h','min','1.5','90'],
    ['energy','cal','j','1','4.184'], ['energy','kcal','j','1','4184'],
    ['energy','wh','j','1','3600'], ['energy','kwh','j','1','3600000'],
];
test('independent known values distinguish definitions across all eight categories', () => {
    for (const [category,from,to,input,expected] of cases) {
        const result = convertUnits(category,from,to,input);
        assert.equal(result.text,expected,`${category}: ${input} ${from} -> ${to}`);
        assert.equal(result.rounded,false);
    }
});
test('decimal arithmetic avoids intermediate binary rounding and permits identity/zero', () => {
    assert.deepEqual(convertUnits('length','m','cm','0.1').value,[10n,1n]);
    for (const [category,group] of Object.entries(UNIT_GROUPS)) {
        for (const unit of group.units) {
            assert.equal(convertUnits(category,unit.id,unit.id,'123.456').text,'123.456');
            assert.equal(convertUnits(category,unit.id,unit.id,'0').text,'0');
        }
    }
});
test('input limits reject malformed data before computation', () => {
    for (const input of ['', ' ', 'NaN', 'Infinity','1,000','1e3','１','1.','--1','0.0000000001',
        '1000000000001','1234567.123456789','<script>','0'.repeat(65)]) {
        assert.throws(() => parseInput(input),undefined,input);
    }
    assert.deepEqual(parseInput(' +.5 '),[1n,2n]);
    assert.deepEqual(parseInput('0.000000001'),[1n,1000000000n]);
    assert.deepEqual(parseInput('1000000000000'),[1000000000000n,1n]);
});
test('temperature lower bound is checked exactly, including one decimal step below', () => {
    for (const [unit,lower] of [['c','-273.150000001'],['f','-459.670000001'],['k','-0.000000001']]) {
        assert.throws(() => convertUnits('temperature',unit,'k',lower),/絶対零度/);
    }
    assert.equal(convertUnits('temperature','c','k','-273.149999999').text,'1e-9');
    assert.equal(convertUnits('temperature','c','f','-40').text,'-40');
    for (const [category,group] of Object.entries(UNIT_GROUPS)) {
        if (category !== 'temperature') assert.throws(() => convertUnits(category,group.units[0].id,group.units[1].id,'-1'),/0以上/);
    }
});
test('display rounds at twelve significant digits and retains tiny/large nonzero values', () => {
    assert.equal(convertUnits('time','s','h','1').text,'0.000277777777778');
    assert.equal(convertUnits('time','s','h','1').rounded,true);
    assert.equal(convertUnits('length','km','mm','1000000000000').text,'1e+18');
    assert.equal(convertUnits('length','mm','km','0.000000001').text,'1e-15');
    assert.equal(convertUnits('length','m','m','1234.567890125').text,'1234.56789013');
    assert.equal(convertUnits('temperature','c','f','-100.000000001').text,'-148.000000002');
    assert.equal(convertUnits('length','m','m','999999999999.5').text,'1e+12');
});
test('only units from the selected category can be converted', () => {
    for (const args of [['length','kg','m','1'],['energy','w','j','1'],['volume','oz','l','1'],['unknown','m','m','1']]) {
        assert.throws(() => convertUnits(...args),/分類と単位/);
    }
});
test('reference tables disclose definitions and temperature uses formulas', () => {
    assert.match(referenceRelation('volume',UNIT_GROUPS.volume.units.find(unit=>unit.id==='us')),/3.785411784 L/);
    assert.match(referenceRelation('temperature',UNIT_GROUPS.temperature.units[0]),/273.15/);
    assert.match(UNIT_GROUPS.energy.hint,/熱化学/);
    assert.match(UNIT_GROUPS.volume.hint,/米国と英国/);
});
