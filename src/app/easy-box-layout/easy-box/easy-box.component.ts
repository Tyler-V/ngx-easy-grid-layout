import { Component, Input, Renderer2, ElementRef, ViewChild, HostBinding, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
import { Position, ElementPosition } from './position.class';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import 'rxjs/add/observable/fromEvent';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/throttleTime';

import { EasyBoxLayoutService } from '../easy-box-layout.service';

@Component({
  selector: 'ez-box',
  templateUrl: './easy-box.component.html',
  styleUrls: ['./easy-box.component.scss']
})
export class EasyBoxComponent implements OnDestroy {

  @Input() width: string;
  @Input() height: string;

  @HostBinding('style.height.px') heightPx: number;
  @HostBinding('style.width.px') widthPx: number;
  @HostBinding('style.top.px') topPx: number;
  @HostBinding('style.left.px') leftPx: number;
  @HostBinding('style.display') display: string;

  public index: number;

  private startEvent: MouseEvent | TouchEvent;
  private dragStartSubscription: Subscription;
  private dragSubscription: Subscription;
  private reorderSubscription: Subscription;
  private dragEndSubscription: Subscription;

  constructor(
    public elementRef: ElementRef,
    private layoutService: EasyBoxLayoutService,
    private sanitizer: DomSanitizer,
    private renderer: Renderer2) {
    this.dragEvents();
  }

  ngOnDestroy() {
    this.dragStartSubscription.unsubscribe();
    this.dragSubscription.unsubscribe();
    this.reorderSubscription.unsubscribe();
    this.dragEndSubscription.unsubscribe();
  }

  private dragEvents() {
    this.dragStartSubscription = Observable.merge(
      Observable.fromEvent(this.elementRef.nativeElement, 'mousedown'),
      Observable.fromEvent(this.elementRef.nativeElement, 'touchstart'))
      .subscribe((e: MouseEvent | TouchEvent) => {
        this.startEvent = e;
        this.onDragStart(e);
      });
    const drag$: Observable<any> = Observable.merge(
      Observable.fromEvent(document, 'mousemove'),
      Observable.fromEvent(document, 'touchmove'))
      .filter(_ => this.startEvent != null);
    this.dragSubscription = drag$
      .subscribe((e: MouseEvent | TouchEvent) => {
        this.onDragging(e);
      });
    this.reorderSubscription = drag$
      .subscribe((e: MouseEvent | TouchEvent) => {
        this.layoutService.repackEvent.emit(this.elementRef);
      });
    this.dragEndSubscription = Observable.merge(
      Observable.fromEvent(document, 'mouseup'),
      Observable.fromEvent(document, 'touchend'))
      .filter(_ => this.startEvent != null)
      .subscribe((e: MouseEvent | TouchEvent) => {
        this.startEvent = null;
        this.onDragEnd(e);
      });
  }

  private onDragStart(e: MouseEvent | TouchEvent) {
    this.renderer.addClass(this.elementRef.nativeElement, 'dragging');
  }

  private onDragging(e: MouseEvent | TouchEvent) {
    const position =
      Position.calculate(e, this.startEvent, this.elementRef.nativeElement, this.layoutService.lockInsideParent);
    this.renderer.setStyle(this.elementRef.nativeElement, 'transform', `translate3d(${position.left}px, ${position.top}px, 0)`);
  }

  private onDragEnd(e: MouseEvent | TouchEvent) {
    const position = this.getPosition();
    this.layoutService.repackEvent.emit(this.elementRef);
    this.renderer.removeStyle(this.elementRef.nativeElement, 'transform');
    this.renderer.removeClass(this.elementRef.nativeElement, 'dragging');
    this.leftPx = position.left;
    this.topPx = position.top;
  }

  public getPosition(): ElementPosition {
    const transform = String(this.elementRef.nativeElement.style.transform);
    if (!transform) {
      return {
        left: undefined,
        top: undefined
      };
    }
    const regex = /(-*\d+)px/g;
    const matches: Array<string> = transform.match(regex);
    const x = parseInt(matches[0], 10);
    const y = parseInt(matches[1], 10);
    const z = parseInt(matches[2], 10);
    const position = {
      left: this.leftPx + x,
      top: this.topPx + y
    };
    console.log(position);
    return position;
  }
}
