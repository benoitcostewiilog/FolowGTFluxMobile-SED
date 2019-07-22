import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { PassagePage } from './passage';
import { MenuLightModule } from '../../components/menu-light/menu-light.module';
@NgModule({
  declarations: [
    PassagePage,
  ],
  imports: [
    IonicPageModule.forChild(PassagePage),
    MenuLightModule
  ],
})
export class PassagePageModule { }
