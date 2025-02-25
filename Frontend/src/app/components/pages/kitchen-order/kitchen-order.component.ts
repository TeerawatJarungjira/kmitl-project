import { Component, OnInit, Inject, PLATFORM_ID, NgZone } from '@angular/core';
import { KitchenOrderService } from '../../../service/kitchen-order.service';
import { isPlatformBrowser } from '@angular/common';
import Swal from 'sweetalert2';

interface Menu {
  menu_id: number;
  menu_name: string;
  menu_note: string;
  menu_qty: number;
  menu_type_id: number;
  price: number;
  total: number;
}

interface OrderItem {
  menu_qty: any;
  menu_id: any;
  create_date: string;
  menus: Menu[];
  order_item_id: number;
  status_order: number;
  status_serve: number;
}

interface Order {
  order_id: number;
  table_id: number;
  orders_items: OrderItem[];
}

@Component({
  selector: 'app-kitchen-order',
  standalone: false,
  templateUrl: './kitchen-order.component.html',
  styleUrl: './kitchen-order.component.css'
})
export class KitchenOrderComponent implements OnInit {
  orders: Order[] = [];
  filteredOrders: Order[] = [];
  menu_types: any[] = [];
  selectedCategories: number[] = [];
  orderItems: OrderItem[] = [];

  constructor(private service: KitchenOrderService , @Inject(PLATFORM_ID) private platformId: Object, private ngZone: NgZone) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const savedFilters = localStorage.getItem('selectedCategories');
      console.log('LocalStorage Before Load:', savedFilters);
      this.selectedCategories = savedFilters ? JSON.parse(savedFilters) : [];
      console.log('Selected Categories After Load:', this.selectedCategories);

      const savedFilteredOrders = localStorage.getItem('filteredOrders');
      this.filteredOrders = savedFilteredOrders ? JSON.parse(savedFilteredOrders) : [];
      console.log('Filtered Orders After Load:', this.filteredOrders);
    } else {
        this.selectedCategories = [];
        this.filteredOrders = [];
    }

    this.fetchOrderItems();
    this.fetchOrders();

    if (isPlatformBrowser(this.platformId) && typeof window !== 'undefined') {
      this.ngZone.runOutsideAngular(() => {
          setInterval(() => {
              this.ngZone.run(() => {
                  this.fetchOrders();
                  this.fetchOrderItems();
              });
          }, 5000);
      });
    }  
    this.service.getAllMenuTypes().subscribe((res) => {
      this.menu_types = res;
      console.log('Menu Types:', this.menu_types);
    });

    this.service.getAllNowOrders().subscribe(
      (res) => {
        console.log('API Response:', res);
        this.orders = Object.values(res) as Order[];
        if (this.filteredOrders.length === 0) {
          this.filterOrders();
        }
      },
      (error) => {
        console.error('Error fetching order data:', error);
      }
    );

    this.fetchOrderItems();
  }

  fetchOrders(): void {
    this.service.getAllNowOrders().subscribe(
      (res) => {
        console.log('API Response:', res);
        this.orders = Object.values(res) as Order[];
        this.filterOrders();
      },
      (error) => {
        console.error('Error fetching order data:', error);
      }
    );
  }

  fetchOrderItems(): void {
    this.service.getAllOrderItems().subscribe(
      (res) => {
        console.log('Fetched Order Items:', res);
        this.orderItems = res;
      },
      (error) => {
        console.error('Error fetching order items:', error);
      }
    );
  }

  onCategoryChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = Number(target.value);

    if (target.checked) {
      this.selectedCategories.push(value);
    } else {
      this.selectedCategories = this.selectedCategories.filter(cat => cat !== value);
    }

    console.log('Selected Categories:', this.selectedCategories);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('selectedCategories', JSON.stringify(this.selectedCategories));
    }
    this.filterOrders();
  }

  filterOrders(): void {
    if (this.selectedCategories.length === 0) {
      this.filteredOrders = [...this.orders];
    } else {
      this.filteredOrders = this.orders
        .map(order => {
          const filteredItems = order.orders_items.map(item => {
            return {
              ...item,
              menus: item.menus.filter(menu =>
                this.selectedCategories.includes(menu.menu_type_id)
              )
            };
          }).filter(item => item.menus.length > 0);
  
          return filteredItems.length > 0 ? { ...order, orders_items: filteredItems } : null;
        })
        .filter(order => order !== null);
    }
  
    console.log('Filtered Orders:', this.filteredOrders);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('filteredOrders', JSON.stringify(this.filteredOrders));
    }
  }  

  updateOrderItemStatus(): void {
    this.fetchOrderItems();
  }

  getOrderStatusClass(orderItemId: number): string {
    const orderItem = this.orderItems.find(item => item.order_item_id === orderItemId);
    if (!orderItem) {
      // console.error(`Order Item ID ${orderItemId} not found.`);
      return 'gray';
    }
    return orderItem.status_order === 2 ? 'green' : orderItem.status_order === 1 ? 'orange' : 'gray';
  }

  getServeStatusClass(orderItemId: number): string {
    const orderItem = this.orderItems.find(item => item.order_item_id === orderItemId);
    if (!orderItem) {
      // console.error(`Order Item ID ${orderItemId} not found.`);
      return 'gray';
    }
    return orderItem.status_serve === 1 ? 'green' : 'gray';
  }

  getOrderItemClass(item: OrderItem): string {
    const isCompleted = this.getOrderStatusClass(item.order_item_id) === 'green' &&
                        this.getServeStatusClass(item.order_item_id) === 'green';
    
    return isCompleted ? 'completed-item' : '';
  }  

  changeOrderStatus(orderId: number, orderItemId: number): void {
    console.log('Fetching latest Order Item before changing status:', { orderId, orderItemId });

    if (!this.orderItems || this.orderItems.length === 0) {
      console.error('Order Items list is empty or not initialized.');
      return;
  }

    if (!orderItemId) {
        console.error('Invalid Order Item ID:', orderItemId);
        return;
    }

    const orderItem = this.orderItems.find(item => item.order_item_id === orderItemId);
    if (!orderItem) {
      console.error(`Order Item ID ${orderItemId} not found.`);
      return;
    }

    const latestStatusOrder = orderItem.status_order;
    const operation = latestStatusOrder === 2 ? 'back' : 'next';
    const payload = { order: orderId, order_item: orderItemId, operation: operation };

    console.log('Calling API with payload:', payload);

    this.service.changeOrderStatus(payload).subscribe(
      (res) => {
        console.log('Order status updated:', res);
        this.updateOrderItemStatus();
        
        if (latestStatusOrder === 0) {
          const orderItem = this.orderItems.find(item => item.order_item_id === orderItemId);
      
          if (orderItem) {
              // ใช้ menu_id และ menu_qty จาก orderItem โดยตรง
              if (orderItem.menu_id && orderItem.menu_qty) {
                  const stockPayload = {
                      menu_id: orderItem.menu_id,
                      qty: orderItem.menu_qty
                  };
      
                  console.log("Calling stockManager API with payload:", stockPayload);
      
                  this.service.stockManager(stockPayload).subscribe(
                      (res) => console.log('Stock updated successfully:', res),
                      (error) => console.error('Error updating stock:', error)
                  );
              } else {
                  console.error("Missing menu_id or menu_qty in orderItem:", orderItem);
              }
          } else {
              console.error("Order item not found:", orderItemId);
          }
        }
      },
      (error) => {
        console.error('Error updating order status:', error);
      }
    );
  }

  changeServeStatus(orderId: number, orderItemId: number): void {
    console.log('Fetching latest Order Item before changing serve status:', { orderId, orderItemId });

    const orderItem = this.orderItems.find(item => item.order_item_id === orderItemId);
    if (!orderItem) {
      console.error(`Order Item ID ${orderItemId} not found.`);
      return;
    }

    const latestStatusServe = orderItem.status_serve;
    const latestStatusOrder = orderItem.status_order;

    if (latestStatusOrder < 2 && latestStatusServe === 0) {
      console.warn('Cannot change serve status before order status is 2');
      return;
    }

    const operation = latestStatusServe === 1 ? 'back' : 'next';
    const payload = { order: orderId, order_item: orderItemId, operation: operation };

    console.log('Calling API with payload:', payload);

    this.service.changeServeStatus(payload).subscribe(
      (res) => {
        console.log('Serve status updated:', res);
        this.updateOrderItemStatus();
      },
      (error) => {
        console.error('Error updating serve status:', error);
      }
    );
  }

  cancelOrder(orderId: number, orderItemId: number): void {
    console.log(`Checking order item before canceling: Order ID ${orderId}, Order Item ID ${orderItemId}`);

    const orderItem = this.orderItems.find(item => item.order_item_id === orderItemId);
    
    if (!orderItem) {
        console.error(`Order Item ID ${orderItemId} not found.`);
        return;
    }

    // ถ้า status_order ไม่ใช่ 0 ห้ามยกเลิก
    if (orderItem.status_order !== 0) {
        Swal.fire('Warning', 'ไม่สามารถยกเลิกได้ เนื่องจากอาหารถูกเตรียมเรียบร้อยแล้ว', 'warning');
        return;
    }

    Swal.fire({
        title: 'ยืนยันการยกเลิก?',
        text: "คุณแน่ใจหรือไม่ว่าต้องการยกเลิกออเดอร์นี้?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            const payload = { order: orderId, orderitem: orderItemId };

            console.log("Sending cancel order request:", payload);

            this.service.cancelOrder(payload).subscribe(
                (res) => {
                    console.log("Order canceled successfully!", res);
                    Swal.fire('สำเร็จ', 'ออเดอร์ถูกยกเลิกเรียบร้อย', 'success');
                    this.fetchOrders();
                },
                (error) => {
                    console.error("Error canceling order:", error);
                    Swal.fire('Error', 'เกิดข้อผิดพลาดในการยกเลิกออเดอร์', 'error');
                }
            );
        }
    });
  }
  
  wasteOrder(orderItemId: number, menuName: string, quantity: number): void {
    Swal.fire({
      title: `กำหนดให้ "${menuName}" เป็นขยะ?`,
      input: "text",
      inputPlaceholder: "กรอกเหตุผล (ตัวอย่าง: อาหารไหม้)",
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const reason = result.value;
        const payload = {
          order_item_id: orderItemId,
          type: "order",
          quantity: quantity,
          reason: reason,
          note: "Marked as waste",
        };
  
        this.service.wasteOrder(payload).subscribe(
          (res) => {
            console.log("Order marked as waste successfully!", res);
            Swal.fire("สำเร็จ!", "รายการถูกทำเครื่องหมายเป็นขยะ", "success");
            this.fetchOrders();
          },
          (error) => {
            console.error("Error marking order as waste:", error);
            Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถทำเครื่องหมายเป็นขยะได้", "error");
          }
        );
      }
    });
  }
}
