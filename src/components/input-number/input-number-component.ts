import { Component, Input, ViewChild, ElementRef } from '@angular/core';


@Component({
  selector: 'input-number-component',
  templateUrl: 'input-number-component.html',
})
export class InputNumberComponent {

  @Input("value") value: number;
  @Input("min") min: number = 0;
  @Input("max") max: number = Number.MAX_VALUE;
  @Input("readonly") readonly: boolean = false;

  @ViewChild('inputNumber') inputNumber: ElementRef;


  constructor() {
  }

  incrementQte() {
    if (this.value == null || isNaN(this.value)) {
      this.value = 1;
    } else {
      if (this.value >= this.max) {
        this.value = this.max;
      } else {
        let qte = this.value;
        qte = Number.parseInt(qte + "");
        this.value = qte + 1;
      }
    }
  }

  decrementQte() {
    if (this.value == null || isNaN(this.value)) {
      this.value = 0;
    } else {
      if (this.value <= this.min) {
        this.value = this.min;
      } else {
        let qte = this.value;
        qte = Number.parseInt(qte + "");
        this.value = qte - 1;
      }
    }
  }

  getValue() {
    return this.value ? this.value : 0;
  }

  isValid(): boolean {
    let value = this.value;
    if (value != null && !isNaN(value) && value >= this.min && value <= this.max) {
      return true;
    }
    return false;
  }

  setValue(value) {
    if (!isNaN(value) && value >= this.min && value <= this.max) {
      this.value = value;
    }
  }

  setMax(value) {
    this.max = value;
  }
  setMin(value) {
    this.min = value;
  }

  focus() {
    this.inputNumber.nativeElement.focus();
  }

}
